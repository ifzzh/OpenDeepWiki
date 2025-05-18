using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;

namespace KoalaWiki.WarehouseProcessing;

public partial class WarehouseDescriptionTask(ILogger<WarehouseDescriptionTask> logger, IServiceProvider service)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(1000, stoppingToken);

        await using var scope = service.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

        while (stoppingToken.IsCancellationRequested == false)
        {
            try
            {
                // 获取所有仓库=2
                var warehouses = await dbContext!.Warehouses
                    .Where(x => x.Status == WarehouseStatus.Completed && string.IsNullOrEmpty(x.Description) &&
                                string.IsNullOrEmpty(x.Readme))
                    .FirstOrDefaultAsync(stoppingToken);

                if (warehouses == null)
                {
                    // 如果没有仓库，等待一段时间
                    await Task.Delay(1000 * 60, stoppingToken);
                    continue;
                }

                var documents = await dbContext.Documents
                    .Where(x => x.WarehouseId == warehouses.Id)
                    .FirstOrDefaultAsync(stoppingToken);

                var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                    OpenAIOptions.ChatApiKey, documents.GitPath, OpenAIOptions.ChatModel);

                if (string.IsNullOrEmpty(warehouses.Readme))
                {
                    warehouses.Readme = await DocumentsService.GenerateReadMe(warehouses, documents.GitPath, dbContext);
                }

                if (string.IsNullOrWhiteSpace(warehouses.Readme))
                {
                    logger.LogInformation("没有获取到README文件,跳过");
                    return;
                }

                var result = await kernel.InvokeAsync(kernel.Plugins["CodeAnalysis"]["GenerateDescription"],
                    new KernelArguments()
                    {
                        ["readme"] = warehouses.Readme
                    }, stoppingToken);

                // 正则表达式提取<description></description>

                var regex = DescriptionRegex();
                var match = regex.Match(result.ToString());
                if (match.Success)
                {
                    var description = match.Groups[1].Value;
                    warehouses.Description = description;
                }
                else
                {
                    logger.LogError("没有匹配到<description></description>");
                }

                await dbContext.Warehouses.Where(x => x.Id == warehouses.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Description, warehouses.Description), stoppingToken);
            }
            catch (Exception e)
            {
                logger.LogError(e, "Error in WarehouseDescriptionTask");
                await Task.Delay(1000, stoppingToken);
            }
        }
    }

    [GeneratedRegex("<description>(.*?)</description>", RegexOptions.Singleline)]
    private static partial Regex DescriptionRegex();
}