using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.WarehouseProcessing;

public partial class WarehouseProcessingTask(IServiceProvider service, ILogger<WarehouseProcessingTask> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(1000, stoppingToken);

        // 读取环境变量，获取更新间隔
        var updateInterval = 5;
        if (int.TryParse(Environment.GetEnvironmentVariable("UPDATE_INTERVAL"), out var interval))
        {
            updateInterval = interval;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. 读取现有的仓库状态=2
                await using var scope = service.CreateAsyncScope();

                var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

                // 读取现有的仓库状态=2，并且处理时间满足一星期
                var warehouses = await dbContext!.Warehouses
                    .Where(x => x.Status == WarehouseStatus.Completed)
                    .ToListAsync(stoppingToken);

                var ids = warehouses.Select(x => x.Id).ToArray();

                var documents = await dbContext.Documents
                    .Where(x => ids.Contains(x.WarehouseId) && x.LastUpdate < DateTime.Now.AddDays(-updateInterval))
                    .Select(x => x.WarehouseId)
                    .ToListAsync(stoppingToken);

                // 从这里得到了超过一星期没更新的仓库
                warehouses = await dbContext.Warehouses
                    .Where(x => documents.Contains(x.Id))
                    .ToListAsync(stoppingToken);

                if (warehouses.Count == 0)
                {
                    await Task.Delay(1000 * 60, stoppingToken);
                }
                else
                {
                    foreach (var warehouse in warehouses)
                    {
                        await HandleAnalyseAsync(warehouse, dbContext);

                        // 更新git记录
                        await dbContext.Documents
                            .Where(x => x.WarehouseId == warehouse.Id)
                            .ExecuteUpdateAsync(x => x.SetProperty(a => a.LastUpdate, DateTime.Now), stoppingToken);


                    }
                }
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "处理仓库失败");
            }
            finally
            {
                // 等待一段时间再继续处理
                await Task.Delay(1000 * 60, stoppingToken);
            }
        }
    }
}