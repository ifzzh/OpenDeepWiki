using System.ClientModel.Primitives;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using FastService;
using KoalaWiki.Dto;
using KoalaWiki.Functions;
using KoalaWiki.Prompts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using OpenAI.Chat;
using ChatMessageContent = Microsoft.SemanticKernel.ChatMessageContent;

#pragma warning disable SKEXP0001

namespace KoalaWiki.Services.AI;

[Tags("Responese")]
[FastService.Route("")]
public class ResponsesService(IKoalaWikiContext koala) : FastApi
{
    [HttpPost("/api/Responses")]
    public async Task ExecuteAsync(HttpContext context, ResponsesInput input)
    {
        var warehouse = await koala.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.OrganizationName.ToLower() == input.OrganizationName.ToLower() &&
                x.Name.ToLower() == input.Name.ToLower());

        if (warehouse == null)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Warehouse not found",
                code = 404,
            });
            return;
        }


        var document = await koala.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouse.Id)
            .FirstOrDefaultAsync();

        if (document == null)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "document not found",
                code = 404,
            });
            return;
        }


        // 解析仓库的目录结构
        var path = document.GitPath;

        var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

        if (OpenAIOptions.EnableMem0)
        {
            kernel.Plugins.AddFromObject(new RagFunction(warehouse!.Id));
        }

        DocumentContext.DocumentStore = new DocumentStore();


        var chat = kernel.GetRequiredService<IChatCompletionService>();

        var history = new ChatHistory();

        history.AddSystemMessage(await PromptContext.Chat(nameof(PromptConstant.Chat.Responses),
            new KernelArguments()
            {
                ["catalogue"] = warehouse.OptimizedDirectoryStructure,
                ["repository"] = warehouse.Address
            }, OpenAIOptions.DeepResearchModel));

        // 添加消息历史记录
        foreach (var msg in input.Messages)
        {
            if (msg.Role.ToLower() == "user")
            {
                // 处理用户消息
                string content = msg.Content;

                // 如果有图片内容，添加到消息中
                if (msg.ImageContents != null && msg.ImageContents.Count > 0)
                {
                    // 添加多模态消息
                    var contentItems = new ChatMessageContentItemCollection();
                    foreach (var image in msg.ImageContents)
                    {
                        contentItems.Add(new BinaryContent($"data:{image.MimeType};base64,{image.Data}"));
                    }

                    contentItems.Add(new TextContent(content));

                    history.AddUserMessage(contentItems);
                }
                else
                {
                    // 纯文本消息
                    history.AddUserMessage(content);
                }
            }
            else if (msg.Role.ToLower() == "assistant")
            {
                history.AddAssistantMessage(msg.Content);
            }
            else if (msg.Role.ToLower() == "system")
            {
                history.AddSystemMessage(msg.Content);
            }
        }

        // sse
        context.Response.Headers.ContentType = "text/event-stream";
        context.Response.Headers.CacheControl = "no-cache";

        // 是否推理中
        var isReasoning = false;

        // 是否普通消息
        var isMessage = false;


        await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                           new OpenAIPromptExecutionSettings()
                           {
                               ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                               MaxTokens = DocumentsService.GetMaxTokens(OpenAIOptions.DeepResearchModel),
                               Temperature = 0.5,
                           }, kernel))
        {
            // 发送数据
            if (chatItem.InnerContent is not StreamingChatCompletionUpdate message) continue;


            var jsonContent = JsonNode.Parse(ModelReaderWriter.Write(chatItem.InnerContent!));

            var choices = jsonContent!["choices"] as JsonArray;
            if (choices?.Count > 0)
            {
                if (choices[0]!["delta"]!["reasoning_content"] != null)
                {
                    // 推理内容
                    var reasoningContent = choices![0]!["delta"]!["reasoning_content"].ToString();
                    if (!string.IsNullOrEmpty(reasoningContent))
                    {
                        if (isReasoning == false)
                        {
                            // 结束普通消息
                            if (isMessage)
                            {
                                isMessage = false;

                                await context.Response.WriteAsync($"data: {{\"type\": \"message_end\"}}\n\n");
                            }

                            isReasoning = true;

                            // 发送开启推理事件
                            await context.Response.WriteAsync($"data: {{\"type\": \"reasoning_start\"}}\n\n");
                        }

                        await context.Response.WriteAsync(
                            $"data: {{\"type\": \"reasoning_content\", \"content\": {JsonSerializer.Serialize(reasoningContent)}}}\n\n");
                        await context.Response.Body.FlushAsync();
                        continue;
                    }
                }
            }

            if (isReasoning)
            {
                // 结束推理
                isReasoning = false;
                await context.Response.WriteAsync($"data: {{\"type\": \"reasoning_end\"}}\n\n");

                isMessage = true;
                // 开启普通消息
                await context.Response.WriteAsync($"data: {{\"type\": \"message_start\"}}\n\n");
            }

            if (message.ToolCallUpdates.Count > 0)
            {
                // 工具调用更新
                foreach (var toolCallUpdate in message.ToolCallUpdates)
                {
                    var toolCallData = new
                    {
                        type = "tool_call",
                        tool_call_id = toolCallUpdate.ToolCallId,
                        function_name = toolCallUpdate.FunctionName,
                        function_arguments = Encoding.UTF8.GetString(toolCallUpdate.FunctionArgumentsUpdate),
                    };

                    await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(toolCallData)}\n\n");
                    await context.Response.Body.FlushAsync();
                }

                continue;
            }

            // 普通消息内容
            if (!string.IsNullOrEmpty(chatItem.Content))
            {
                if (!isMessage)
                {
                    isMessage = true;
                    // 开启普通消息
                    await context.Response.WriteAsync($"data: {{\"type\": \"message_start\"}}\n\n");
                }

                var messageData = new
                {
                    type = "message_content",
                    content = chatItem.Content
                };

                await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(messageData)}\n\n");
                await context.Response.Body.FlushAsync();
            }
        }

        // 确保最后结束消息
        if (isMessage)
        {
            await context.Response.WriteAsync($"data: {{\"type\": \"message_end\"}}\n\n");
        }

        if (isReasoning)
        {
            await context.Response.WriteAsync($"data: {{\"type\": \"reasoning_end\"}}\n\n");
        }

        // 发送结束事件
        await context.Response.WriteAsync($"data: {{\"type\": \"done\"}}\n\n");
        await context.Response.Body.FlushAsync();
    }
}