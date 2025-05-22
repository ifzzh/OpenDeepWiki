using System.Text;
using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace KoalaWiki.WarehouseProcessing;

/// <summary>
/// 仓库描述生成任务
/// </summary>
/// <param name="service"></param>
/// <param name="logger"></param>
public partial class WarehouseFunctionPromptTask(IServiceProvider service, ILogger<WarehouseFunctionPromptTask> logger)
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
                    .Where(x => x.Status == WarehouseStatus.Completed && string.IsNullOrEmpty(x.Prompt))
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

                var readme = await DocumentsService.GenerateReadMe(warehouses, documents.GitPath, dbContext);

                if (string.IsNullOrEmpty(readme))
                {
                    logger.LogError("没有获取到README文件");
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                    OpenAIOptions.ChatApiKey, null, OpenAIOptions.ChatModel);

                var result = new StringBuilder();

                await foreach (var item in kernel.InvokeStreamingAsync(kernel.Plugins["CodeAnalysis"]["FunctionPrompt"],
                                   new KernelArguments()
                                   {
                                       ["readme"] = readme,
                                       ["name"] = warehouses.Name,
                                       ["owner"] = warehouses.OrganizationName
                                   }, stoppingToken))
                {
                    result.Append(item.ToString());
                }

                var regex = FunctionPromptRegex();
                var match = regex.Match(result.ToString());
                if (match.Success)
                {
                    var description = match.Groups[1].Value;
                    warehouses.Prompt = description;
                }
                else
                {
                    logger.LogError("没有匹配到<function_prompt></function_prompt>");
                }

                await dbContext.Warehouses.Where(x => x.Id == warehouses.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(a => a.Prompt, warehouses.Prompt), stoppingToken);
            }
            catch (Exception e)
            {
                logger.LogError(e, "Error in WarehouseDescriptionTask");
                await Task.Delay(1000, stoppingToken);
            }
        }
    }


    [GeneratedRegex("<function_prompt>(.*?)</function_prompt>", RegexOptions.Singleline)]
    private static partial Regex FunctionPromptRegex();
}