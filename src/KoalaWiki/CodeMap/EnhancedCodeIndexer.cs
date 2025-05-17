using System.Text;
using KoalaWiki.CodeMap.Language;
using KoalaWiki.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.KernelMemory;
using Microsoft.KernelMemory.Configuration;
using Microsoft.KernelMemory.DocumentStorage.DevTools;
using Microsoft.KernelMemory.FileSystem.DevTools;
using Microsoft.KernelMemory.MemoryStorage.DevTools;

#pragma warning disable SKEXP0010

#pragma warning disable SKEXP0001

namespace KoalaWiki.CodeMap;

public class EnhancedCodeIndexer
{
    private readonly IKernelMemory _kernelMemory;
    private readonly ILogger _logger;
    private readonly OpenAIConfig _openAIConfig;

    public EnhancedCodeIndexer()
    {
        _logger = NullLogger<EnhancedCodeIndexer>.Instance;


        _openAIConfig = new OpenAIConfig()
        {
            APIKey = OpenAIOptions.ChatApiKey,
            Endpoint = OpenAIOptions.Endpoint,
            TextModel = OpenAIOptions.ChatModel,
            EmbeddingModel = OpenAIOptions.EmbeddingsModel,
            TextGenerationType = OpenAIConfig.TextGenerationTypes.TextCompletion,
        };

        _kernelMemory = BuilderKernelMemory();
    }

    public IKernelMemory BuilderKernelMemory()
    {
        var directory = Path.Combine("/data", "VectorDb");

        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var memoryBuilder = new KernelMemoryBuilder()
            .WithCustomTextPartitioningOptions(new TextPartitioningOptions
            {
                MaxTokensPerParagraph = 200,
                OverlappingTokens = 0,
            })
            .WithSimpleFileStorage(new SimpleFileStorageConfig
            {
                StorageType = FileSystemTypes.Disk,
                Directory = directory
            })
            .WithSimpleVectorDb(new SimpleVectorDbConfig
            {
                StorageType = FileSystemTypes.Disk,
                Directory = directory,
            })
            .WithOpenAITextGeneration(_openAIConfig)
            .WithOpenAITextEmbeddingGeneration(_openAIConfig);

        return memoryBuilder.Build();
    }

    /// <summary>
    /// 索引代码文件
    /// </summary>
    public async Task IndexCodeFileAsync(string filePath, string warehouseId)
    {
        if (!File.Exists(filePath))
        {
            _logger.LogError($"文件不存在: {filePath}");
            return;
        }

        string code = await File.ReadAllTextAsync(filePath);
        string language = DetermineLanguage(filePath);
        string fileName = Path.GetFileName(filePath);

        _logger.LogInformation($"正在索引文件: {fileName}, 语言: {language}");


        await _kernelMemory.ImportTextAsync(code, Guid.NewGuid().ToString("N"), new TagCollection()
        {
            { "WarehouseId", warehouseId },
            { "FileName", fileName },
            { "FilePath", filePath },
            { "CodeLanguage", language },
            { "Language", language },
        }, warehouseId);


        // 根据语言解析代码并切片
        // var codeSegments = await ParseAndSegmentCodeAsync(code, language, filePath);

        // 为每个代码段创建嵌入并存储
        // foreach (var segment in codeSegments)
        // {
        //     string id = $"{fileName}:{segment.StartLine}-{segment.EndLine}";
        //
        //     // 创建丰富的描述，包含代码结构和上下文信息
        //     string description = BuildSegmentDescription(segment, fileName);
        //     _logger.LogDebug("已索引代码段: {Id} - {SegmentType}", id, segment.Type);
        // }
    }

    /// <summary>
    /// 搜索相似代码
    /// </summary>
    public async Task<List<(string Id, string Code, string Description, double Relevance)>> SearchSimilarCodeAsync(
        string query, string warehouseId, int limit = 5)
    {
        var result = await _kernelMemory.SearchAsync(query, filter: new MemoryFilter()
        {
            // { "WarehouseId", warehouseId }
        }, index: warehouseId, limit: limit);

        var results = new List<(string Id, string Code, string Description, double Relevance)>();

        foreach (var citation in result.Results)
        {
            foreach (var partition in citation.Partitions)
            {
                var id = partition.Tags["Id"].FirstOrDefault();
                var code = partition.Tags["Code"].FirstOrDefault();
                var description = partition.Tags["Description"].FirstOrDefault();
                var relevance = partition.Relevance;
                if (id != null && code != null && description != null)
                {
                    results.Add((id, code, description, relevance));
                }
            }
        }

        return results;
    }

    /// <summary>
    /// 构建代码段的丰富描述
    /// </summary>
    private string BuildSegmentDescription(CodeSegment segment, string fileName)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"Code from {fileName} (lines {segment.StartLine}-{segment.EndLine})");
        sb.AppendLine($"Type: {segment.Type}");

        if (!string.IsNullOrEmpty(segment.Namespace))
            sb.AppendLine($"Namespace: {segment.Namespace}");

        if (segment.Dependencies.Any())
            sb.AppendLine($"Dependencies: {string.Join(", ", segment.Dependencies)}");

        if (!string.IsNullOrEmpty(segment.Documentation))
            sb.AppendLine($"Documentation: {segment.Documentation}");

        if (!string.IsNullOrEmpty(segment.ClassName))
        {
            sb.AppendLine($"Class: {segment.ClassName}");
        }

        if (!string.IsNullOrEmpty(segment.Parameters))
            sb.AppendLine($"Parameters: {segment.Parameters}");

        if (!string.IsNullOrEmpty(segment.ReturnType))
            sb.AppendLine($"Return Type: {segment.ReturnType}");

        if (!string.IsNullOrEmpty(segment.Name))
            sb.AppendLine($"Name: {segment.Name}");

        sb.AppendLine($"Code: {segment.Code}");
        sb.AppendLine($"File: {fileName}");

        return sb.ToString();
    }

    /// <summary>
    /// 根据文件扩展名确定编程语言
    /// </summary>
    private string DetermineLanguage(string filePath)
    {
        string extension = Path.GetExtension(filePath).ToLower();

        return extension switch
        {
            ".cs" => "csharp",
            ".java" => "java",
            ".py" => "python",
            ".js" => "javascript",
            ".ts" => "typescript",
            ".go" => "go",
            ".rb" => "ruby",
            ".php" => "php",
            ".c" => "c",
            ".cpp" => "cpp",
            ".h" => "c",
            ".hpp" => "cpp",
            ".jsx" => "javascript",
            ".tsx" => "typescript",
            ".scala" => "scala",
            ".kt" => "kotlin",
            ".swift" => "swift",
            ".rs" => "rust",
            _ => "unknown"
        };
    }

    /// <summary>
    /// 根据语言解析代码并进行智能切片
    /// </summary>
    private async Task<List<CodeSegment>> ParseAndSegmentCodeAsync(string code, string language, string filePath)
    {
        return language switch
        {
            "csharp" => await ParseCSharp.ParseCSharpCodeWithRoslynAsync(code, filePath),
            "python" => ParsePython.ParsePythonCode(code),
            "javascript" => ParseJavaScript.ParseJavaScriptCode(code),
            "typescript" => ParseJavaScript.ParseTypeScriptCode(code),
            "java" => ParseJava.ParseJavaCode(code),
            "go" => ParseGo.ParseGoCode(code),
            "rust" => ParseRust.ParseRustCode(code),
            _ => ParseCode.ParseGenericCode(code)
        };
    }
}