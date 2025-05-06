using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.Memory.Embedding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.VectorData;
using Microsoft.SemanticKernel.Connectors.Sqlite;
using Microsoft.SemanticKernel.Embeddings;
using Microsoft.SemanticKernel.Text;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Polly;
using Polly.Retry;

#pragma warning disable SKEXP0001

#pragma warning disable SKEXP0050

namespace KoalaWiki.Memory;

public class MemoryTask(IVectorStore vectorStore, IServiceProvider service) : BackgroundService
{
    private readonly AsyncRetryPolicy _embeddingRetryPolicy = Policy
        .Handle<Exception>()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            (exception, timeSpan, retryCount, context) =>
            {
                Console.WriteLine($"嵌入重试 {retryCount}/3 失败: {exception.Message}");
            });

    private readonly AsyncRetryPolicy _vectorStoreRetryPolicy = Policy
        .Handle<Exception>()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            (exception, timeSpan, retryCount, context) =>
            {
                Console.WriteLine($"向量存储操作重试 {retryCount}/3 失败: {exception.Message}");
            });

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessMemoryTasksAsync();
            }
            catch (Exception exception)
            {
                await Task.Delay(5000, stoppingToken);
            }
            finally
            {
                await Task.Delay(10000, stoppingToken);
            }
        }
    }

    private async Task ProcessMemoryTasksAsync()
    {
        // 获取所有仓库
        await using var scope = service.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();
        var embedding = scope.ServiceProvider.GetService<ITextEmbeddingGenerationService>();

        var memoryTasks = await dbContext.Warehouses
            .Where(x => x.Status == WarehouseStatus.Completed && x.IsEmbedded == false).ToListAsync();

        IVectorStoreRecordCollection<string, TextParagraph>? vectorStoreRecordCollection = null;

        foreach (var task in memoryTasks)
        {
            // 开始处理仓库下所有的文件
            var files = await dbContext.DocumentCatalogs.Where(x => x.WarehouseId == task.Id)
                .Select(x => x.Id)
                .ToListAsync();
            var knowledgeItems = await dbContext.DocumentFileItems
                .Where(x => files.Contains(x.DocumentCatalogId) && x.IsEmbedded == false)
                .ToListAsync();


            foreach (var file in knowledgeItems)
            {
                var textChunks = TextChunker.SplitPlainTextLines(file.Content, 2048);

                var texts = new List<TextParagraph>();
                var i = 1;

                foreach (var chunk in textChunks)
                {
                    var embeddingValue =
                        await _embeddingRetryPolicy.ExecuteAsync(() => embedding.GenerateEmbeddingAsync(chunk));

                    // 获取当前向量维度
                    var dimension = embeddingValue.Length;
                    vectorStoreRecordCollection ??= await GetCollection(vectorStore, task.Id, dimension);

                    var id = file.Id;
                    // 判断当前fileitem是否存在
                    var existingText = false;
                    await foreach (var item in vectorStoreRecordCollection.GetAsync(
                                       x => x.DocumentFileItemId == id, 1,
                                       new GetFilteredRecordOptions<TextParagraph>()
                                       {
                                           IncludeVectors = false,
                                       }))
                    {
                        if (item != null)
                        {
                            existingText = true;
                            break;
                        }
                    }

                    if (existingText)
                    {
                        // 如果存在则跳过
                        continue;
                    }

                    var textParagraph = new TextParagraph
                    {
                        Key = Guid.NewGuid().ToString(),
                        FileName = file.Title,
                        DocumentCatalogId = file.DocumentCatalogId,
                        DocumentFileItemId = file.Id,
                        WarehouseId = task.Id,
                        Index = i++,
                        Tag = string.Empty,
                        Text = chunk,
                        TextEmbedding = embeddingValue
                    };

                    texts.Add(textParagraph);
                }

                if (texts.Count > 0)
                {
                    // 批量插入
                    await _vectorStoreRetryPolicy.ExecuteAsync(() => vectorStoreRecordCollection.UpsertAsync(texts));

                    await dbContext.DocumentFileItems
                        .Where(x => x.Id == file.Id)
                        .ExecuteUpdateAsync(x => x.SetProperty(i => i.IsEmbedded, true));
                }
            }

            await dbContext.Warehouses
                .Where(x => x.Id == task.Id)
                .ExecuteUpdateAsync(x => x.SetProperty(i => i.IsEmbedded, true));
        }
    }

    public static async Task<List<TextParagraph>> Search(IVectorStore vectorStore, string name, string warehouseId,
        ReadOnlyMemory<float> embedding, double score = 0.5)
    {
        var texts = new List<TextParagraph>();
        var dimension = embedding.Length;
        if (dimension == 1536)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph1536>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();

            await foreach (var item in vectorStoreRecordCollection.SearchEmbeddingAsync(embedding, 5,
                               new VectorSearchOptions<TextParagraph1536>()
                               {
                                   Filter = paragraph => paragraph.WarehouseId == warehouseId,
                                   IncludeVectors = true,
                               }))
            {
                if (item.Score > score)
                {
                    texts.Add(item.Record);
                }
            }
        }
        else if (dimension == 2048)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph2048>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
            await foreach (var item in vectorStoreRecordCollection.SearchEmbeddingAsync(embedding, 5,
                               new VectorSearchOptions<TextParagraph2048>()
                               {
                                   Filter = paragraph => paragraph.WarehouseId == warehouseId,
                                   IncludeVectors = true,
                               }))
            {
                if (item.Score > score)
                {
                    texts.Add(item.Record);
                }
            }
        }
        else if (dimension == 768)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph768>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
            await foreach (var item in vectorStoreRecordCollection.SearchEmbeddingAsync(embedding, 5,
                               new VectorSearchOptions<TextParagraph768>()
                               {
                                   Filter = paragraph => paragraph.WarehouseId == warehouseId,
                                   IncludeVectors = true,
                               }))
            {
                if (item.Score > score)
                {
                    texts.Add(item.Record);
                }
            }
        }
        else if (dimension == 1024)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph1024>("koala" + name);

            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
            await foreach (var item in vectorStoreRecordCollection.SearchEmbeddingAsync(embedding, 5,
                               new VectorSearchOptions<TextParagraph1024>()
                               {
                                   Filter = paragraph => paragraph.WarehouseId == warehouseId,
                                   IncludeVectors = true,
                               }))
            {
                if (item.Score > score)
                {
                    texts.Add(item.Record);
                }
            }
        }
        else if (dimension == 512)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph512>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
            await foreach (var item in vectorStoreRecordCollection.SearchEmbeddingAsync(embedding, 5,
                               new VectorSearchOptions<TextParagraph512>()
                               {
                                   Filter = paragraph => paragraph.WarehouseId == warehouseId,
                                   IncludeVectors = true,
                               }))
            {
                if (item.Score > score)
                {
                    texts.Add(item.Record);
                }
            }
        }
        else
        {
            throw new Exception("不支持的向量维度");
        }


        return texts;
    }

    public static async Task<IVectorStoreRecordCollection<string, TextParagraph>?> GetCollection(
        IVectorStore vectorStore, string name, int dimension)
    {
        if (dimension == 1536)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph1536>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
        }
        else if (dimension == 2048)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph2048>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
        }
        else if (dimension == 768)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph768>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
        }
        else if (dimension == 1024)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph1024>("koala" + name);

            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
        }
        else if (dimension == 512)
        {
            var vectorStoreRecordCollection = vectorStore.GetCollection<string, TextParagraph512>("koala" + name);
            await vectorStoreRecordCollection.CreateCollectionIfNotExistsAsync();
        }
        else
        {
            throw new Exception("不支持的向量维度");
        }

        return vectorStore.GetCollection<string, TextParagraph>("koala" + name);
    }
}