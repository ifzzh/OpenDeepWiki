using KoalaWiki.DbAccess;
using KoalaWiki.Entities;
using KoalaWiki.Git;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.KoalaWarehouse;

public class WarehouseTask(
    GitService gitService,
    WarehouseStore warehouseStore,
    ILogger<WarehouseTask> logger,
    DocumentsService documentsService,
    IServiceProvider service)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 读取现有的仓库

        await using (var scope = service.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetService<KoalaDbAccess>();

            var warehouses = await dbContext!.Warehouses
                .Where(x => x.Status == WarehouseStatus.Pending)
                .ToListAsync(stoppingToken);

            foreach (var warehouse in warehouses)
            {
                await warehouseStore.WriteAsync(warehouse, stoppingToken);
            }
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var value = await warehouseStore.ReadAsync(stoppingToken);
            var scope = service.CreateAsyncScope();

            var dbContext = scope.ServiceProvider.GetService<KoalaDbAccess>();

            try
            {
                // 先拉取仓库
                var (localPath, name, organization) = gitService.PullRepository(value.Address);

                await dbContext!.Warehouses.Where(x => x.Id == value.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Name, name)
                        .SetProperty(x => x.OrganizationName, organization), stoppingToken);

                var document = new Document()
                {
                    GitPath = localPath,
                    WarehouseId = value.Id,
                    Status = WarehouseStatus.Pending,
                    Description = value.Description,
                    Id = Guid.NewGuid().ToString("N")
                };

                await dbContext.Documents.Where(x => x.WarehouseId == value.Id)
                    .ExecuteDeleteAsync(stoppingToken);

                await dbContext.Documents.AddAsync(document, stoppingToken);

                await dbContext.SaveChangesAsync(stoppingToken);

                await documentsService.HandleAsync(document, value, dbContext,value.Address);

                // 更新仓库状态
                await dbContext.Warehouses.Where(x => x.Id == value.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Status, WarehouseStatus.Completed), stoppingToken);

                // 提交更改
                await dbContext.Documents.Where(x => x.Id == document.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.LastUpdate, DateTime.UtcNow)
                        .SetProperty(a => a.Status, WarehouseStatus.Completed), stoppingToken);
            }
            catch (Exception e)
            {
                logger.LogError("发生错误：{e}", e);

                await dbContext.Warehouses.Where(x => x.Id == value.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Status, WarehouseStatus.Failed)
                        .SetProperty(x => x.Error, e.ToString()), stoppingToken);

                // 删除其他的
                await dbContext.Documents.Where(x => x.WarehouseId == value.Id)
                    .ExecuteDeleteAsync(cancellationToken: stoppingToken);
            }
        }
    }
}