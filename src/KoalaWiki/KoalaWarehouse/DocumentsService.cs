﻿using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using KoalaWiki.Domains;
using KoalaWiki.Domains.Warehouse;
using KoalaWiki.Entities;
using KoalaWiki.Functions;
using KoalaWiki.KoalaWarehouse.DocumentPending;
using KoalaWiki.KoalaWarehouse.GenerateThinkCatalogue;
using KoalaWiki.KoalaWarehouse.Overview;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace KoalaWiki.KoalaWarehouse;

public partial class DocumentsService
{
    /// <summary>
    /// 解析指定目录下单.gitignore配置忽略的文件
    /// </summary>
    /// <returns></returns>
    private static string[] GetIgnoreFiles(string path)
    {
        var ignoreFilePath = Path.Combine(path, ".gitignore");
        if (File.Exists(ignoreFilePath))
        {
            // 需要去掉注释
            var lines = File.ReadAllLines(ignoreFilePath);
            var ignoreFiles = lines.Where(x => !string.IsNullOrWhiteSpace(x) && !x.StartsWith("#"))
                .Select(x => x.Trim()).ToList();

            ignoreFiles.AddRange(DocumentOptions.ExcludedFiles);

            return ignoreFiles.ToArray();
        }

        return [];
    }

    public static List<PathInfo> GetCatalogueFiles(string path)
    {
        var ignoreFiles = GetIgnoreFiles(path);

        var pathInfos = new List<PathInfo>();
        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);
        return pathInfos;
    }

    public static string GetCatalogue(string path)
    {
        var ignoreFiles = GetIgnoreFiles(path);

        var pathInfos = new List<PathInfo>();
        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);
        var catalogue = new StringBuilder();

        foreach (var info in pathInfos)
        {
            // 删除前缀 Constant.GitPath
            var relativePath = info.Path.Replace(path, "").TrimStart('\\');

            // 过滤.开头的文件
            if (relativePath.StartsWith("."))
                continue;

            catalogue.Append($"{relativePath}\n");
        }

        // 直接返回
        return catalogue.ToString();
    }

    /// <summary>
    /// 获取优化的树形目录结构，大幅节省tokens
    /// </summary>
    /// <param name="path">扫描路径</param>
    /// <param name="format">输出格式：compact(紧凑文本)、json(JSON格式)、pathlist(优化路径列表)</param>
    /// <returns>优化后的目录结构</returns>
    public static string GetCatalogueOptimized(string path, string format = "compact")
    {
        var ignoreFiles = GetIgnoreFiles(path);
        var pathInfos = new List<PathInfo>();

        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);

        // 构建文件树
        var fileTree = FileTreeBuilder.BuildTree(pathInfos, path);

        return format.ToLower() switch
        {
            "json" => FileTreeBuilder.ToCompactJson(fileTree),
            "pathlist" => string.Join("\n", FileTreeBuilder.ToPathList(fileTree)),
            "compact" or _ => FileTreeBuilder.ToCompactString(fileTree)
        };
    }

    /// <summary>
    /// 获取智能过滤的优化树形目录结构
    /// </summary>
    /// <param name="path">扫描路径</param>
    /// <param name="readme">README内容</param>
    /// <param name="format">输出格式</param>
    /// <returns>优化后的目录结构</returns>
    public static async Task<string> GetCatalogueSmartFilterOptimizedAsync(string path, string readme,
        string format = "compact")
    {
        var ignoreFiles = GetIgnoreFiles(path);
        var pathInfos = new List<PathInfo>();

        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);

        // 如果文件数量较少，直接返回优化结构
        if (pathInfos.Count < 800)
        {
            var fileTree = FileTreeBuilder.BuildTree(pathInfos, path);
            return format.ToLower() switch
            {
                "json" => FileTreeBuilder.ToCompactJson(fileTree),
                "pathlist" => string.Join("\n", FileTreeBuilder.ToPathList(fileTree)),
                "compact" or _ => FileTreeBuilder.ToCompactString(fileTree)
            };
        }

        // 如果不启用智能过滤，返回优化结构
        if (DocumentOptions.EnableSmartFilter == false)
        {
            var fileTree = FileTreeBuilder.BuildTree(pathInfos, path);
            return format.ToLower() switch
            {
                "json" => FileTreeBuilder.ToCompactJson(fileTree),
                "pathlist" => string.Join("\n", FileTreeBuilder.ToPathList(fileTree)),
                "compact" or _ => FileTreeBuilder.ToCompactString(fileTree)
            };
        }

        Log.Logger.Information("开始优化目录结构（使用树形格式）");

        var analysisModel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.AnalysisModel);

        var codeDirSimplifier = analysisModel.Plugins["CodeAnalysis"]["CodeDirSimplifier"];

        // 使用优化的目录结构作为输入
        var optimizedInput = GetCatalogueOptimized(path, "compact");

        var sb = new StringBuilder();
        int retryCount = 0;
        const int maxRetries = 5;
        Exception? lastException = null;

        while (retryCount < maxRetries)
        {
            try
            {
                await foreach (var item in analysisModel.InvokeStreamingAsync(codeDirSimplifier, new KernelArguments(
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       MaxTokens = GetMaxTokens(OpenAIOptions.AnalysisModel)
                                   })
                               {
                                   ["code_files"] = optimizedInput,
                                   ["readme"] = readme
                               }))
                {
                    sb.Append(item);
                }

                // 成功则跳出循环
                lastException = null;
                break;
            }
            catch (Exception ex)
            {
                retryCount++;
                lastException = ex;
                Log.Logger.Error(ex, $"优化目录结构失败，重试第{retryCount}次");
                if (retryCount >= maxRetries)
                {
                    throw new Exception($"优化目录结构失败，已重试{maxRetries}次", ex);
                }

                await Task.Delay(5000 * retryCount);
                sb.Clear();
            }
        }

        // 正则表达式提取response_file
        var regex = new Regex("<response_file>(.*?)</response_file>", RegexOptions.Singleline);
        var match = regex.Match(sb.ToString());
        if (match.Success)
        {
            return match.Groups[1].Value;
        }

        // 可能是```json
        var jsonRegex = new Regex("```json(.*?)```", RegexOptions.Singleline);
        var jsonMatch = jsonRegex.Match(sb.ToString());
        if (jsonMatch.Success)
        {
            return jsonMatch.Groups[1].Value;
        }

        return sb.ToString();
    }

    /// <summary>
    /// 获取智能过滤的目录结构（保持向后兼容的原始方法）
    /// </summary>
    /// <param name="path">扫描路径</param>
    /// <param name="readme">README内容</param>
    /// <returns>目录结构字符串</returns>
    public static async Task<string> GetCatalogueSmartFilterAsync(string path, string readme)
    {
        var ignoreFiles = GetIgnoreFiles(path);

        var pathInfos = new List<PathInfo>();
        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);
        var catalogue = new StringBuilder();

        foreach (var info in pathInfos)
        {
            // 删除前缀 Constant.GitPath
            var relativePath = info.Path.Replace(path, "").TrimStart('\\');

            // 过滤.开头的文件
            if (relativePath.StartsWith("."))
                continue;

            catalogue.Append($"{relativePath}\n");
        }

        // 如果文件数量小于800
        if (pathInfos.Count < 800)
        {
            // 直接返回
            return catalogue.ToString();
        }

        // 如果不启用则直接返回
        if (DocumentOptions.EnableSmartFilter == false)
        {
            return catalogue.ToString();
        }

        Log.Logger.Information("开始优化目录结构");

        var analysisModel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.AnalysisModel);

        var codeDirSimplifier = analysisModel.Plugins["CodeAnalysis"]["CodeDirSimplifier"];

        var sb = new StringBuilder();
        int retryCount = 0;
        const int maxRetries = 5;
        Exception? lastException = null;

        while (retryCount < maxRetries)
        {
            try
            {
                await foreach (var item in analysisModel.InvokeStreamingAsync(codeDirSimplifier, new KernelArguments(
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       MaxTokens = GetMaxTokens(OpenAIOptions.AnalysisModel)
                                   })
                               {
                                   ["code_files"] = catalogue.ToString(),
                                   ["readme"] = readme
                               }))
                {
                    sb.Append(item);
                }

                // 成功则跳出循环
                lastException = null;
                break;
            }
            catch (Exception ex)
            {
                retryCount++;
                lastException = ex;
                Log.Logger.Error(ex, $"优化目录结构失败，重试第{retryCount}次");
                if (retryCount >= maxRetries)
                {
                    throw new Exception($"优化目录结构失败，已重试{maxRetries}次", ex);
                }

                await Task.Delay(5000 * retryCount);
                sb.Clear();
            }
        }

        // 正则表达式提取response_file
        var regex = new Regex("<response_file>(.*?)</response_file>", RegexOptions.Singleline);
        var match = regex.Match(sb.ToString());
        if (match.Success)
        {
            // 提取到的内容
            var extractedContent = match.Groups[1].Value;
            catalogue.Clear();
            catalogue.Append(extractedContent);
        }
        else
        {
            // 可能是```json
            var jsonRegex = new Regex("```json(.*?)```", RegexOptions.Singleline);
            var jsonMatch = jsonRegex.Match(sb.ToString());
            if (jsonMatch.Success)
            {
                // 提取到的内容
                var extractedContent = jsonMatch.Groups[1].Value;
                catalogue.Clear();
                catalogue.Append(extractedContent);
            }
            else
            {
                catalogue.Clear();
                catalogue.Append(sb);
            }
        }

        return catalogue.ToString();
    }

    public static async Task<string> GenerateReadMe(Warehouse warehouse, string path,
        IKoalaWikiContext koalaWikiContext)
    {
        var readme = await ReadMeFile(path);

        if (string.IsNullOrEmpty(readme) && string.IsNullOrEmpty(warehouse.Readme))
        {
            var catalogue = GetCatalogue(path);

            var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                OpenAIOptions.ChatApiKey,
                path, OpenAIOptions.ChatModel);

            var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

            // 生成README
            var generateReadmePlugin = kernel.Plugins["CodeAnalysis"]["GenerateReadme"];
            var generateReadme = await fileKernel.InvokeAsync(generateReadmePlugin, new KernelArguments(
                new OpenAIPromptExecutionSettings()
                {
                    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                    Temperature = 0.5,
                })
            {
                ["catalogue"] = catalogue,
                ["git_repository"] = warehouse.Address.Replace(".git", ""),
                ["branch"] = warehouse.Branch
            });

            readme = generateReadme.ToString();
            // 可能需要先处理一下documentation_structure 有些模型不支持json
            var readmeRegex = new Regex(@"<readme>(.*?)</readme>", RegexOptions.Singleline);
            var readmeMatch = readmeRegex.Match(readme);

            if (readmeMatch.Success)
            {
                // 提取到的内容
                var extractedContent = readmeMatch.Groups[1].Value;
                readme = extractedContent;
            }

            await koalaWikiContext.Warehouses.Where(x => x.Id == warehouse.Id)
                .ExecuteUpdateAsync(x => x.SetProperty(y => y.Readme, readme));
        }
        else
        {
            await koalaWikiContext.Warehouses.Where(x => x.Id == warehouse.Id)
                .ExecuteUpdateAsync(x => x.SetProperty(y => y.Readme, readme));
        }

        if (string.IsNullOrEmpty(readme))
        {
            return warehouse.Readme;
        }

        return readme;
    }

    /// <summary>
    /// Handles the asynchronous processing of a document within a specified warehouse, including parsing directory structures, generating update logs, and saving results to the database.
    /// </summary>
    /// <param name="document">The document to be processed.</param>
    /// <param name="warehouse">The warehouse associated with the document.</param>
    /// <param name="dbContext">The database context used for data operations.</param>
    /// <param name="gitRepository">The Git repository address related to the document.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task HandleAsync(Document document, Warehouse warehouse, IKoalaWikiContext dbContext,
        string gitRepository)
    {
        // 解析仓库的目录结构
        var path = document.GitPath;

        var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey,
            path, OpenAIOptions.ChatModel);

        var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

        var readme = await GenerateReadMe(warehouse, path, dbContext);

        var catalogue = warehouse.OptimizedDirectoryStructure;

        if (string.IsNullOrWhiteSpace(catalogue))
        {
            catalogue = await GetCatalogueSmartFilterOptimizedAsync(path, readme);
            if (!string.IsNullOrWhiteSpace(catalogue))
            {
                await dbContext.Warehouses.Where(x => x.Id == warehouse.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(y => y.OptimizedDirectoryStructure, catalogue));
            }
        }

        var classify = warehouse.Classify ?? await WarehouseClassify.ClassifyAsync(fileKernel, catalogue, readme);

        await dbContext.Warehouses.Where(x => x.Id == warehouse.Id)
            .ExecuteUpdateAsync(x => x.SetProperty(y => y.Classify, classify));

        
        // 生成MiniMap
        var miniMap = await MiniMapService.GenerateMiniMap(catalogue, warehouse, path);
        await dbContext.MiniMaps.Where(x => x.WarehouseId == warehouse.Id)
            .ExecuteDeleteAsync();
        await dbContext.MiniMaps.AddAsync(new MiniMap()
        {
            Id = Guid.NewGuid().ToString("N"),
            WarehouseId = warehouse.Id,
            Value = JsonSerializer.Serialize(miniMap, JsonSerializerOptions.Web)
        });
        
        var overview = await OverviewService.GenerateProjectOverview(fileKernel, catalogue, gitRepository,
            warehouse.Branch, readme, classify);

        // 先删除<project_analysis>标签内容
        var project_analysis = new Regex(@"<project_analysis>(.*?)</project_analysis>",
            RegexOptions.Singleline);
        var project_analysis_match = project_analysis.Match(overview);
        if (project_analysis_match.Success)
        {
            // 删除到的内容包括标签
            overview = overview.Replace(project_analysis_match.Value, "");
        }

        // 可能需要先处理一下documentation_structure 有些模型不支持json
        var overviewmatch = new Regex(@"<blog>(.*?)</blog>",
            RegexOptions.Singleline).Match(overview);

        if (overviewmatch.Success)
        {
            // 提取到的内容
            overview = overviewmatch.Groups[1].Value;
        }

        await dbContext.DocumentOverviews.Where(x => x.DocumentId == document.Id)
            .ExecuteDeleteAsync();

        await dbContext.DocumentOverviews.AddAsync(new DocumentOverview()
        {
            Content = overview,
            Title = "",
            DocumentId = document.Id,
            Id = Guid.NewGuid().ToString("N")
        });


        var result =
            await GenerateThinkCatalogueService.GenerateCatalogue(path, gitRepository, catalogue, warehouse,
                classify);

        var documents = new List<DocumentCatalog>();
        // 递归处理目录层次结构
        ProcessCatalogueItems(result.items, null, warehouse, document, documents);

        documents.ForEach(x =>
        {
            x.IsCompleted = false;
            if (string.IsNullOrWhiteSpace(x.Prompt))
            {
                x.Prompt = " ";
            }
        });

        // 删除遗留数据
        await dbContext.DocumentCatalogs.Where(x => x.WarehouseId == warehouse.Id)
            .ExecuteDeleteAsync();

        // 将解析的目录结构保存到数据库
        await dbContext.DocumentCatalogs.AddRangeAsync(documents);

        await dbContext.SaveChangesAsync();

        await DocumentPendingService.HandlePendingDocumentsAsync(documents, fileKernel, catalogue, gitRepository,
            warehouse, path, dbContext, warehouse.Classify);

        if (warehouse.Type.Equals("git", StringComparison.CurrentCultureIgnoreCase))
        {
            await dbContext.DocumentCommitRecords.Where(x => x.WarehouseId == warehouse.Id)
                .ExecuteDeleteAsync();

            // 开始生成
            var committer = await GenerateUpdateLogAsync(document.GitPath, readme,
                warehouse.Address,
                warehouse.Branch,
                kernel);

            var record = committer.Select(x => new DocumentCommitRecord()
            {
                WarehouseId = warehouse.Id,
                CreatedAt = DateTime.Now,
                Author = string.Empty,
                Id = Guid.NewGuid().ToString("N"),
                CommitMessage = x.description,
                Title = x.title,
                LastUpdate = x.date,
            });

            // 如果重新生成则需要清空之前记录
            await dbContext.DocumentCommitRecords.Where(x => x.WarehouseId == warehouse.Id)
                .ExecuteDeleteAsync();

            await dbContext.DocumentCommitRecords.AddRangeAsync(record);
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static int? GetMaxTokens(string model)
    {
        if (model.StartsWith("deepseek-r1", StringComparison.OrdinalIgnoreCase))
        {
            return 32768;
        }

        if (model.StartsWith("o"))
        {
            return 65535;
        }

        if (model.StartsWith("MiniMax-M1", StringComparison.OrdinalIgnoreCase))
        {
            return 40000;
        }

        return model switch
        {
            "deepseek-chat" => 8192,
            "DeepSeek-V3" => 16384,
            "QwQ-32B" => 8192,
            "gpt-4.1-mini" => 32768,
            "gpt-4.1" => 32768,
            "gpt-4o" => 16384,
            "o4-mini" => 32768,
            "doubao-1-5-pro-256k-250115" => 256000,
            "o3-mini" => 32768,
            "Qwen/Qwen3-235B-A22B" => null,
            "grok-3" => 65536,
            "qwen2.5-coder-3b-instruct" => 65535,
            "qwen3-235b-a22b" => 16384,
            "claude-sonnet-4-20250514" => 63999,
            "gemini-2.5-pro-preview-05-06" => 32768,
            "gemini-2.5-flash-preview-04-17" => 32768,
            "Qwen3-32B" => 32768,
            "deepseek-r1:32b-qwen-distill-fp16" => 32768,
            _ => null
        };
    }

    private static void ProcessCatalogueItems(List<DocumentResultCatalogueItem> items, string? parentId,
        Warehouse warehouse,
        Document document, List<DocumentCatalog>? documents)
    {
        int order = 0; // 创建排序计数器
        foreach (var item in items)
        {
            item.title = item.title.Replace(" ", "");
            var documentItem = new DocumentCatalog
            {
                WarehouseId = warehouse.Id,
                Description = item.title,
                Id = Guid.NewGuid() + item.title,
                Name = item.name,
                Url = item.title,
                DucumentId = document.Id,
                ParentId = parentId,
                Prompt = item.prompt,
                Order = order++ // 为当前层级的每个项目设置顺序值并递增
            };

            documents.Add(documentItem);

            ProcessCatalogueItems(item.children.ToList(), documentItem.Id, warehouse, document,
                documents);
        }
    }

    /// <summary>
    /// 读取仓库的ReadMe文件
    /// </summary>
    /// <returns></returns>
    public static async Task<string> ReadMeFile(string path)
    {
        var readmePath = Path.Combine(path, "README.md");
        if (File.Exists(readmePath))
        {
            return await File.ReadAllTextAsync(readmePath);
        }

        readmePath = Path.Combine(path, "README.txt");
        if (File.Exists(readmePath))
        {
            return await File.ReadAllTextAsync(readmePath);
        }

        readmePath = Path.Combine(path, "README");
        if (File.Exists(readmePath))
        {
            return await File.ReadAllTextAsync(readmePath);
        }

        return string.Empty;
    }

    static void ScanDirectory(string directoryPath, List<PathInfo> infoList, string[] ignoreFiles)
    {
        // 遍历所有文件
        infoList.AddRange(from file in Directory.GetFiles(directoryPath).Where(file =>
            {
                var filename = Path.GetFileName(file);

                // 支持*的匹配
                foreach (var pattern in ignoreFiles)
                {
                    if (string.IsNullOrWhiteSpace(pattern) || pattern.StartsWith("#"))
                        continue;

                    var trimmedPattern = pattern.Trim();

                    // 转换gitignore模式到正则表达式
                    if (trimmedPattern.Contains('*'))
                    {
                        string regexPattern = "^" + Regex.Escape(trimmedPattern).Replace("\\*", ".*") + "$";
                        if (Regex.IsMatch(filename, regexPattern, RegexOptions.IgnoreCase))
                            return false;
                    }
                    else if (filename.Equals(trimmedPattern, StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }
                }

                return true;
            })
            let fileInfo = new FileInfo(file)
            // 过滤掉大于1M的文件
            where fileInfo.Length < 1024 * 1024 * 1
            select new PathInfo { Path = file, Name = fileInfo.Name, Type = "File" });

        // 遍历所有目录，并递归扫描
        foreach (var directory in Directory.GetDirectories(directoryPath))
        {
            var dirName = Path.GetFileName(directory);

            // 过滤.开头目录
            if (dirName.StartsWith("."))
                continue;

            // 支持通配符匹配目录
            bool shouldIgnore = false;
            foreach (var pattern in ignoreFiles)
            {
                if (string.IsNullOrWhiteSpace(pattern) || pattern.StartsWith("#"))
                    continue;

                var trimmedPattern = pattern.Trim();

                // 如果模式以/结尾，表示只匹配目录
                bool directoryPattern = trimmedPattern.EndsWith("/");
                if (directoryPattern)
                    trimmedPattern = trimmedPattern.TrimEnd('/');

                // 转换gitignore模式到正则表达式
                if (trimmedPattern.Contains('*'))
                {
                    string regexPattern = "^" + Regex.Escape(trimmedPattern).Replace("\\*", ".*") + "$";
                    if (Regex.IsMatch(dirName, regexPattern, RegexOptions.IgnoreCase))
                    {
                        shouldIgnore = true;
                        break;
                    }
                }
                else if (dirName.Equals(trimmedPattern, StringComparison.OrdinalIgnoreCase))
                {
                    shouldIgnore = true;
                    break;
                }
            }

            if (shouldIgnore)
                continue;

            // 递归扫描子目录
            ScanDirectory(directory, infoList, ignoreFiles);
        }
    }
}