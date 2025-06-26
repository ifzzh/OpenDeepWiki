using System.ClientModel.Primitives;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using FastService;
using KoalaWiki.Domains;
using KoalaWiki.Dto;
using KoalaWiki.Functions;
using KoalaWiki.Prompts;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using OpenAI.Chat;

#pragma warning disable SKEXP0001

namespace KoalaWiki.Services;

[Tags("对话服务")]
[Route("/api/Chat")]
public class ChatService(IKoalaWikiContext koala, IUserContext userContext) : FastApi
{
    public async Task CompletionsAsync(CompletionsInput input, HttpContext context)
    {
        var chatShareMessage = await koala.ChatShareMessages
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == input.ChatShareMessageId);

        var warehouse = await koala.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == chatShareMessage.WarehouseId);

        // 是否第一次对话
        var isFirst =
            await koala.ChatShareMessageItems.AnyAsync(x => x.ChatShareMessageId == input.ChatShareMessageId) == false;


        if (isFirst == false && chatShareMessage?.UserId != userContext.CurrentUserId)
        {
            throw new Exception("当前对话不是你的，请不要进行操作");
        }

        var document = await koala.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouse.Id)
            .FirstOrDefaultAsync();

        if (document == null)
        {
            throw new Exception("当前仓库的文档并没有生成，请先生成文档在使用对话功能");
        }

        // 解析仓库的目录结构
        var path = document.GitPath;

        var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

        if (OpenAIOptions.EnableMem0)
        {
            fileKernel.Plugins.AddFromObject(new RagFunction(warehouse!.Id));
        }

        DocumentContext.DocumentStore = new DocumentStore();

        var first = true;

        var items = new ChatShareMessageItem
        {
            Question = input.Question,
            Answer = string.Empty,
            CreatedAt = DateTime.Now,
            WarehouseId = warehouse.Id,
            ChatShareMessageId = input.ChatShareMessageId,
            Id = Guid.NewGuid().ToString(),
        };

        if (isFirst)
        {
            input.Question = chatShareMessage.Question;
        }

        if (chatShareMessage?.IsDeep == true)
        {
            await koala.ChatShareMessageItems.AddAsync(items);


            var sw = Stopwatch.StartNew();

            int requestToken = 0;
            int completionToken = 0;
            var answer = new StringBuilder();

            var files = new List<string>();

            var deepContent = new StringBuilder();

            try
            {
                var history = new ChatHistory();

                if (isFirst)
                {
                    // 第一次对话，添加系统消息
                    history.AddUserMessage(await PromptContext.Chat(nameof(PromptConstant.Chat.FirstDeepChat),
                        new KernelArguments()
                        {
                            ["catalogue"] = warehouse.OptimizedDirectoryStructure,
                            ["repository_url"] = warehouse.Address,
                            ["question"] = input.Question,
                        }, OpenAIOptions.DeepResearchModel));
                }
                else
                {
                    var historyMessage = new StringBuilder();

                    foreach (var item in (await koala.ChatShareMessageItems
                                 .Where(x => x.ChatShareMessageId == input.ChatShareMessageId).ToArrayAsync()))
                    {
                        historyMessage.Append("<user> " + item.Question + "\n</user>\n");
                        historyMessage.Append("<assistant> " + item.Answer + "\n</assistant>\n");
                    }

                    history.AddUserMessage((await PromptContext.Chat(nameof(PromptConstant.Chat.FirstDeepChat),
                        new KernelArguments()
                        {
                            ["catalogue"] = warehouse.OptimizedDirectoryStructure,
                            ["repository_url"] = warehouse.Address,
                            ["question"] = input.Question,
                            ["history"] = historyMessage.ToString(),
                        }, OpenAIOptions.DeepResearchModel)));
                }


                await koala.SaveChangesAsync();

                var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                    OpenAIOptions.ChatApiKey, document.GitPath, OpenAIOptions.DeepResearchModel, false);

                var chat = kernel.GetRequiredService<IChatCompletionService>();


                // sse
                context.Response.Headers.ContentType = "text/event-stream";
                context.Response.Headers.CacheControl = "no-cache";

                await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                                       MaxTokens = DocumentsService.GetMaxTokens(OpenAIOptions.ChatModel),
                                       Temperature = 0.5,
                                   }, fileKernel))
                {
                    // 发送数据
                    if (chatItem.InnerContent is not StreamingChatCompletionUpdate message) continue;


                    var jsonContent = JsonNode.Parse(ModelReaderWriter.Write(chatItem.InnerContent!));

                    if (jsonContent!["choices"]![0]!["delta"]!["reasoning_content"] != null)
                    {
                        // 推理内容
                        var reasoningContent = jsonContent!["choices"]![0]!["delta"]!["reasoning_content"].ToString();
                        if (!string.IsNullOrEmpty(reasoningContent))
                        {
                            await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                            {
                                type = "reasoning",
                                content = reasoningContent,
                            }, JsonSerializerOptions.Web)}\n\n");
                            await context.Response.Body.FlushAsync();
                        }

                        deepContent.Append(reasoningContent);
                    }

                    if (message.Usage is { InputTokenCount: > 0 })
                    {
                        requestToken += message.Usage.InputTokenCount;
                        completionToken += message.Usage.OutputTokenCount;
                    }

                    if (DocumentContext.DocumentStore.Files.Count > 0)
                    {
                        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                        {
                            type = "tool",
                            content = DocumentContext.DocumentStore.Files.Distinct(),
                        }, JsonSerializerOptions.Web)}\n\n");

                        files.AddRange(DocumentContext.DocumentStore.Files.Distinct());
                        await context.Response.Body.FlushAsync();
                        DocumentContext.DocumentStore.Files = [];
                    }

                    if (string.IsNullOrEmpty(chatItem.Content))
                    {
                        continue;
                    }

                    answer.Append(chatItem.Content);

                    await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                    {
                        type = "message",
                        content = chatItem.Content,
                    }, JsonSerializerOptions.Web)}\n\n");
                    await context.Response.Body.FlushAsync();
                }

                sw.Stop();

                files = files.Distinct().ToList();

                var answerContent = answer.ToString();
                var deepContentString = deepContent.ToString();

                await koala.ChatShareMessageItems.Where(x => x.Id == items.Id)
                    .ExecuteUpdateAsync(x =>
                        x.SetProperty(a => a.Answer, answerContent)
                            .SetProperty(a => a.PromptToken, requestToken)
                            .SetProperty(a => a.CompletionToken, completionToken)
                            .SetProperty(a => a.Question, input.Question)
                            .SetProperty(a => a.Think, deepContentString)
                            .SetProperty(a => a.Files, files)
                            .SetProperty(a => a.TotalTime, sw.ElapsedMilliseconds));
            }
            catch (Exception e)
            {
                // 删除添加的数据
                await koala.ChatShareMessageItems
                    .Where(x => x.Id == items.Id)
                    .ExecuteDeleteAsync();
            }
        }
        else
        {
            await koala.ChatShareMessageItems.AddAsync(items);

            var sw = Stopwatch.StartNew();

            int requestToken = 0;
            int completionToken = 0;
            var answer = new StringBuilder();

            var files = new List<string>();

            try
            {
                var history = new ChatHistory();

                if (isFirst)
                {
                    // 第一次对话，添加系统消息
                    history.AddUserMessage(await PromptContext.Chat(nameof(PromptConstant.Chat.FirstChat),
                        new KernelArguments()
                        {
                            ["catalogue"] = warehouse.OptimizedDirectoryStructure,
                            ["repository_url"] = warehouse.Address,
                            ["question"] = input.Question,
                        }, OpenAIOptions.ChatModel));
                }
                else
                {
                    var historyMessage = new StringBuilder();

                    foreach (var item in (await koala.ChatShareMessageItems
                                 .Where(x => x.ChatShareMessageId == input.ChatShareMessageId).ToArrayAsync()))
                    {
                        historyMessage.Append("<user> " + item.Question + "\n</user>\n");
                        historyMessage.Append("<assistant> " + item.Answer + "\n</assistant>\n");
                    }

                    history.AddUserMessage(await PromptContext.Chat(nameof(PromptConstant.Chat.FirstChat),
                        new KernelArguments()
                        {
                            ["catalogue"] = warehouse.OptimizedDirectoryStructure,
                            ["repository_url"] = warehouse.Address,
                            ["question"] = input.Question,
                            ["history"] = historyMessage.ToString(),
                        }, OpenAIOptions.ChatModel));
                }


                await koala.SaveChangesAsync();

                var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                    OpenAIOptions.ChatApiKey, document.GitPath, OpenAIOptions.ChatModel, false);

                var chat = kernel.GetRequiredService<IChatCompletionService>();

                // sse
                context.Response.Headers.ContentType = "text/event-stream";
                context.Response.Headers.CacheControl = "no-cache";

                await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                                       MaxTokens = DocumentsService.GetMaxTokens(OpenAIOptions.ChatModel),
                                       Temperature = 0.5,
                                   }, fileKernel))
                {
                    // 发送数据
                    if (chatItem.InnerContent is not StreamingChatCompletionUpdate message) continue;

                    if (message.Usage is { InputTokenCount: > 0 })
                    {
                        requestToken += message.Usage.InputTokenCount;
                        completionToken += message.Usage.OutputTokenCount;
                    }

                    if (DocumentContext.DocumentStore.Files.Count > 0)
                    {
                        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                        {
                            type = "tool",
                            content = DocumentContext.DocumentStore.Files.Distinct(),
                        }, JsonSerializerOptions.Web)}\n\n");

                        files.AddRange(DocumentContext.DocumentStore.Files.Distinct());
                        await context.Response.Body.FlushAsync();
                        DocumentContext.DocumentStore.Files = [];
                    }

                    if (string.IsNullOrEmpty(chatItem.Content))
                    {
                        continue;
                    }

                    answer.Append(chatItem.Content);

                    await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                    {
                        type = "message",
                        content = chatItem.Content,
                    }, JsonSerializerOptions.Web)}\n\n");
                    await context.Response.Body.FlushAsync();
                }

                sw.Stop();

                files = files.Distinct().ToList();

                var answerContent = answer.ToString();

                await koala.ChatShareMessageItems.Where(x => x.Id == items.Id)
                    .ExecuteUpdateAsync(x =>
                        x.SetProperty(a => a.Answer, answerContent)
                            .SetProperty(a => a.PromptToken, requestToken)
                            .SetProperty(a => a.CompletionToken, completionToken)
                            .SetProperty(a => a.Question, input.Question)
                            .SetProperty(a => a.Files, files)
                            .SetProperty(a => a.TotalTime, sw.ElapsedMilliseconds));
            }
            catch (Exception e)
            {
                // 删除添加的数据
                await koala.ChatShareMessageItems
                    .Where(x => x.Id == items.Id)
                    .ExecuteDeleteAsync();
            }
        }

        await context.Response.WriteAsync($"data: [done]\n\n");
    }
}