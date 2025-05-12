﻿using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains;
using KoalaWiki.Entities;
using KoalaWiki.Git;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.KoalaWarehouse;

public class WarehouseTask(
    WarehouseStore warehouseStore,
    ILogger<WarehouseTask> logger,
    DocumentsService documentsService,
    IServiceProvider service)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 读取现有的仓库
        await Task.Delay(1000, stoppingToken);


        await using (var scope = service.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

            var warehouses = await dbContext!.Warehouses
                .Where(x => x.Status == WarehouseStatus.Pending || x.Status == WarehouseStatus.Processing)
                // 处理中优先
                .OrderByDescending(x => x.Status == WarehouseStatus.Processing)
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

            var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

            try
            {
                // 先拉取仓库
                logger.LogInformation("开始拉取仓库：{Address}", value.Address);
                var info = GitService.CloneRepository(value.Address, value?.GitUserName ?? string.Empty,
                    value?.GitPassword ?? string.Empty, value?.Branch);

                logger.LogInformation("仓库拉取完成：{RepositoryName}, 分支：{BranchName}", info.RepositoryName, info.BranchName);

                await dbContext!.Warehouses.Where(x => x.Id == value.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Name, info.RepositoryName)
                        .SetProperty(x => x.Branch, info.BranchName)
                        .SetProperty(x => x.Version, info.Version)
                        .SetProperty(x => x.Status, WarehouseStatus.Processing)
                        .SetProperty(x => x.OrganizationName, info.Organization), stoppingToken);

                logger.LogInformation("更新仓库信息到数据库完成，仓库ID：{Id}", value.Id);

                Document document;

                if (await dbContext.Documents.AnyAsync(x => x.WarehouseId == value.Id, stoppingToken))
                {
                    document = await dbContext.Documents.FirstAsync(x => x.WarehouseId == value.Id, stoppingToken);
                    logger.LogInformation("获取现有文档记录，文档ID：{Id}", document.Id);
                }
                else
                {
                    document = new Document
                    {
                        Id = Guid.NewGuid().ToString(),
                        WarehouseId = value.Id,
                        CreatedAt = DateTime.UtcNow,
                        LastUpdate = DateTime.UtcNow,
                        GitPath = info.LocalPath,
                        Status = WarehouseStatus.Pending
                    };
                    logger.LogInformation("创建文档记录，文档ID：{Id}", document.Id);
                    await dbContext.Documents.AddAsync(document, stoppingToken);
                    logger.LogInformation("添加新文档记录完成，文档ID：{Id}", document.Id);

                    await dbContext.SaveChangesAsync(stoppingToken);
                }

                logger.LogInformation("数据库更改保存完成，开始处理文档。");

                await documentsService.HandleAsync(document, value, dbContext, value.Address);

                logger.LogInformation("文档处理完成，文档ID：{Id}", document.Id);

                // 更新仓库状态
                await dbContext.Warehouses.Where(x => x.Id == value.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Status, WarehouseStatus.Completed)
                        .SetProperty(x => x.Error, string.Empty), stoppingToken);

                logger.LogInformation("更新仓库状态为完成，仓库ID：{Id}", value.Id);

                // 提交更改
                await dbContext.Documents.Where(x => x.Id == document.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.LastUpdate, DateTime.UtcNow)
                        .SetProperty(a => a.Status, WarehouseStatus.Completed), stoppingToken);

                logger.LogInformation("文档状态更新为完成，文档ID：{Id}", document.Id);
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