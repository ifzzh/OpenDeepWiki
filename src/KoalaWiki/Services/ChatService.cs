using System.Text;
using System.Text.Json;
using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Dto;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.Memory;
using KoalaWiki.Memory.Embedding;
using KoalaWiki.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.VectorData;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Microsoft.SemanticKernel.Embeddings;
using OpenAI.Chat;

#pragma warning disable SKEXP0001

namespace KoalaWiki.Services;

public class ChatService(Kernel kernel, IKoalaWikiContext koala, IVectorStore vectorStore) : FastApi
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
        var isFirst = await koala.ChatShareMessageItems.AnyAsync(x => x.ChatShareMessageId == input.ChatShareMessageId) == false;

        if (warehouse.IsEmbedded == false)
        {
            throw new Exception("知识库未嵌入,请先嵌入知识库");
        }

        var document = await koala.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouse.Id)
            .FirstOrDefaultAsync();

        if (document == null)
        {
            throw new Exception("知识库未嵌入,请先嵌入知识库");
        }

        var chat = kernel.GetRequiredService<IChatCompletionService>();
        var embedding = kernel.GetRequiredService<ITextEmbeddingGenerationService>();

        // 解析仓库的目录结构
        var path = document.GitPath;

        var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);


        var history = new ChatHistory();

        history.AddSystemMessage(Prompt.ChatPrompt.Replace("{{$repo_url}}", warehouse.Address)
            .Replace("{{$repo_name}}", warehouse.Name));

        var embeddingResult = await embedding.GenerateEmbeddingAsync(input.Question);

        var id = warehouse.Id;
        var vectorStoreRecordCollection = await MemoryTask.Search(vectorStore, id, id, embeddingResult);

        var texts = new StringBuilder();
        var ids = vectorStoreRecordCollection.Select(x => x.DocumentFileItemId);

        foreach (var s in vectorStoreRecordCollection.Select(x => x.Text))
        {
            texts.AppendLine(s);
        }

        var conversationHistory = new StringBuilder();
        foreach (var message in input.Messages)
        {
            conversationHistory.Append($"{message.Role}: {message.Content}\n");
        }

        var fileSource = await koala.DocumentFileItemSources
            .AsNoTracking()
            .Where(x => ids.Contains(x.DocumentFileItemId))
            .Select(x => x.Address)
            .ToListAsync();

        if (isFirst)
        {
            history.AddUserMessage(Prompt.FirstPrompt
                .Replace("{{$question}}", chatShareMessage!.Question)
                .Replace("{{$search}}", string.Join('\n', texts))
                .Replace("{{$code_file}}", string.Join('\n', fileSource)));
        }
        else
        {
            history.AddUserMessage(Prompt.HistoryPrompt
                .Replace("{{$question}}", input.Question)
                .Replace("{{$conversation_history}}", conversationHistory.ToString())
                .Replace("{{$search}}", string.Join('\n', texts))
                .Replace("{{$code_file}}", string.Join('\n', fileSource)));
        }


        var first = true;

        DocumentContext.DocumentStore = new DocumentStore();

        await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                           new OpenAIPromptExecutionSettings()
                           {
                               ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                           }, fileKernel))
        {
            if (first)
            {
                // sse
                context.Response.Headers.ContentType = "text/event-stream";
                context.Response.Headers.CacheControl = "no-cache";
                first = false;
            }

            // 发送数据
            if (chatItem.InnerContent is StreamingChatCompletionUpdate message)
            {
                if (message?.FinishReason == ChatFinishReason.ToolCalls)
                {
                    await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                    {
                        type = "tool",
                        content = DocumentContext.DocumentStore.Files,
                    })}\n\n");
                    await context.Response.Body.FlushAsync();
                    DocumentContext.DocumentStore.Files = [];
                    continue;
                }

                await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(new
                {
                    type = "message",
                    content = chatItem.Content,
                })}\n\n");
                await context.Response.Body.FlushAsync();
            }
        }

        await context.Response.WriteAsync($"data: [done]\n\n");
    }
}