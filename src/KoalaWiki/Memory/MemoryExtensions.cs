using System.ClientModel;
using Azure.AI.OpenAI;
using KoalaWiki.Options;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.Sqlite;
using Npgsql;
using OpenAI;

#pragma warning disable SKEXP0010

namespace KoalaWiki.Memory;

public static class MemoryExtensions
{
    public static IServiceCollection AddKoalaMemory(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHostedService<MemoryTask>();

        var kernelBuilder = services.AddKernel();

        if (configuration.GetConnectionString("Type") == "postgres")
        {
            kernelBuilder
                .Services.AddSingleton<NpgsqlDataSource>(sp =>
                {
                    NpgsqlDataSourceBuilder dataSourceBuilder =
                        new(configuration.GetConnectionString("Default"));
                    dataSourceBuilder.UseVector();
                    return dataSourceBuilder.Build();
                });

            kernelBuilder.Services.AddPostgresVectorStore();
        }
        else
        {
            kernelBuilder.Services.AddSqliteVectorStore(configuration.GetConnectionString("Default"),
                new SqliteVectorStoreOptions()
                {
                    VectorVirtualTableName = "koala_memory",
                });
        }

        kernelBuilder.AddOpenAIChatCompletion(OpenAIOptions.ChatModel, new Uri(OpenAIOptions.Endpoint),
            OpenAIOptions.ChatApiKey,
            httpClient: new HttpClient(new KoalaHttpClientHandler()
            {
                AllowAutoRedirect = true,
                MaxAutomaticRedirections = 5,
                MaxConnectionsPerServer = 200,
            })
            {
                // 添加重试
                Timeout = TimeSpan.FromSeconds(16000),
            });

        kernelBuilder.AddOpenAITextEmbeddingGeneration(OpenAIOptions.EmbeddingModel,
            new OpenAIClient(new ApiKeyCredential(OpenAIOptions.EmbeddingApiKey), new OpenAIClientOptions()
            {
                Endpoint = new Uri(OpenAIOptions.EmbeddingEndpoint),
            }));

        return services;
    }
}