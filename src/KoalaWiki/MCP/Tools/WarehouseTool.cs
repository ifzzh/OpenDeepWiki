using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using OpenAI.Chat;

namespace KoalaWiki.Tools;

public sealed class WarehouseTool(IHttpContextAccessor httpContextAccessor, IKoalaWikiContext koala)
{
    public async Task<string> GenerateDocumentAsync(string question)
    {
        var context = httpContextAccessor.HttpContext;
        var owner = context.Request.Query["owner"].ToString();
        var name = context.Request.Query["name"].ToString();

        var warehouse = await koala.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.OrganizationName == owner && x.Name == name);

        if (warehouse == null)
        {
            throw new Exception($"抱歉，您的仓库 {owner}/{name} 不存在或已被删除。");
        }

        var document = await koala.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouse.Id)
            .FirstOrDefaultAsync();

        if (document == null)
        {
            throw new Exception("空异常 Document");
        }

        var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, document.GitPath, OpenAIOptions.ChatModel, false);

        var chat = kernel.GetRequiredService<IChatCompletionService>();

        // 解析仓库的目录结构
        var path = document.GitPath;

        var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

        var history = new ChatHistory();


        var fileSource = DocumentsService.GetCatalogue(document.GitPath);

        history.AddUserMessage(Prompt.DeepFirstPrompt
            .Replace("{{question}}", question)
            .Replace("{{git_repository_url}}", warehouse.Address)
            .Replace("{{catalogue}}", string.Join('\n', fileSource)));

        var first = true;

        DocumentContext.DocumentStore = new DocumentStore();

        var sw = Stopwatch.StartNew();
        var sb = new StringBuilder();

        var files = new List<string>();

        try
        {
            await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                               new OpenAIPromptExecutionSettings()
                               {
                                   ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                                   MaxTokens = DocumentsService.GetMaxTokens(OpenAIOptions.ChatModel),
                                   Temperature = 0.5,
                               }, fileKernel))
            {
                // 发送数据
                if (chatItem.InnerContent is StreamingChatCompletionUpdate message)
                {
                    if (string.IsNullOrEmpty(chatItem.Content))
                    {
                        continue;
                    }

                    if (!string.IsNullOrEmpty(chatItem.Content))
                    {
                        sb.Append(chatItem.Content);
                    }
                }
            }

            sw.Stop();

            return sb.ToString();
        }
        catch (Exception e)
        {
            return "抱歉，发生了错误: " + e.Message;
        }
    }
}