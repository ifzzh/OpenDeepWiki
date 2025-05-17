using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.KoalaWarehouse;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace KoalaWiki.CodeMap;

public class BuildCodeIndex(IServiceProvider service) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(100, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            // 读取现有的仓库
            await using var scope = service.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

            var warehouses = await dbContext!.Warehouses
                .Where(x => x.Status == WarehouseStatus.Completed && x.IsEmbedded == true)
                .ToListAsync(stoppingToken);

            foreach (var warehouse in warehouses)
            {
                var enhancedCodeIndexer = new EnhancedCodeIndexer();

                var value = await enhancedCodeIndexer.SearchSimilarCodeAsync("添加自动迁移代码", warehouse.Id);

                try
                {
                    var documents = await dbContext.Documents
                        .Where(x => x.WarehouseId == warehouse.Id)
                        .FirstOrDefaultAsync(stoppingToken);

                    var files = DocumentsService.GetCatalogueFiles(documents.GitPath);

                    foreach (var file in files)
                    {
                        Log.Logger.Information($"Processing file: {file.Path}");

                        await enhancedCodeIndexer.IndexCodeFileAsync(file.Path, warehouse.Id);

                        Log.Information($"Indexed file {file.Path} for warehouse {warehouse.Id} successfully.");
                    }

                    await dbContext.Warehouses
                        .Where(x => x.Id == warehouse.Id)
                        .ExecuteUpdateAsync(x => x.SetProperty(a => a.IsEmbedded, true),
                            cancellationToken: stoppingToken);
                }
                catch (Exception e)
                {
                    Log.Logger.Error("BuildCodeIndex异常：{Message}", e.Message);

                    await Task.Delay(3000, stoppingToken);
                }
            }
        }
    }
}