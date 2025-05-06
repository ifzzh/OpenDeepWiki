using System.Text;
using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Dto;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.Memory.Embedding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.VectorData;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Microsoft.SemanticKernel.Embeddings;

#pragma warning disable SKEXP0001

namespace KoalaWiki.Services;

public class ChatService(Kernel kernel, IKoalaWikiContext koala, IVectorStore vectorStore) : FastApi
{
    public async Task CompletionsAsync(CompletionsInput input)
    {
        var warehouse = await koala.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.OrganizationName == input.Owner && x.Name == input.Name);

        if (warehouse.IsEmbedded == false)
        {
            throw new Exception("知识库未嵌入,请先嵌入知识库");
        }

        var chat = kernel.GetRequiredService<IChatCompletionService>();
        var embedding = kernel.GetRequiredService<ITextEmbeddingGenerationService>();

        var history = new ChatHistory();

        history.AddSystemMessage(Prompt.ChatPrompt.Replace("{{$repo_url}}", warehouse.Address)
            .Replace("{{$repo_name}}", warehouse.Name));

        var embeddingResult = await embedding.GenerateEmbeddingAsync(input.Question);

        var vectorStoreRecordCollection =
            vectorStore.GetCollection<string, TextParagraph>("knowledge_" + warehouse.Id);

        var texts = new StringBuilder();
        var ids = new List<string>();

        await foreach (var item in vectorStoreRecordCollection.VectorizedSearchAsync(embeddingResult, 5,
                           new VectorSearchOptions<TextParagraph>()
                           {
                               Filter = paragraph => paragraph.WarehouseId == warehouse.Id,
                               IncludeVectors = true,
                           }))
        {
            // 搜索判断0.5
            if (item.Score > 0.5)
            {
                texts.AppendLine(item.Record.Text);
                ids.Add(item.Record.DocumentFileItemId);
            }
        }

        var fileSource = await koala.DocumentFileItemSources
            .AsNoTracking()
            .Where(x => ids.Contains(x.DocumentFileItemId))
            .Select(x => x.Address)
            .ToListAsync();

        history.AddUserMessage(Prompt.HistoryPrompt
            .Replace("{{$question}}", input.Question)
            .Replace("{{$search}}", string.Join('\n', texts))
            .Replace("{{$code_file}}", string.Join('\n', fileSource)));

        await foreach (var chatItem in chat.GetStreamingChatMessageContentsAsync(history,
                           new OpenAIPromptExecutionSettings(), kernel))
        {
            // 
        }
    }
}