using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.Entities.DocumentFile;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Serilog;

namespace KoalaWiki.KoalaWarehouse;

public class DocumentsService
{
    /// <summary>
    /// 解析指定目录下单.gitignore配置忽略的文件
    /// </summary>
    /// <returns></returns>
    private string[] GetIgnoreFiles(string path)
    {
        var ignoreFilePath = Path.Combine(path, ".gitignore");
        if (File.Exists(ignoreFilePath))
        {
            // 需要去掉注释
            var lines = File.ReadAllLines(ignoreFilePath);
            var ignoreFiles = lines.Where(x => !string.IsNullOrWhiteSpace(x) && !x.StartsWith("#"))
                .Select(x => x.Trim()).ToArray();

            return ignoreFiles;
        }

        return [];
    }

    public async Task HandleAsync(Document document, Warehouse warehouse, IKoalaWikiContext dbContext, string gitRepository)
    {
        // 解析仓库的目录结构
        var path = document.GitPath;

        var ignoreFiles = GetIgnoreFiles(path);

        var pathInfos = new List<PathInfo>();
        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);

        var kernel = KernelFactory.GetKernel(warehouse.OpenAIEndpoint,
            warehouse.OpenAIKey,
            path, warehouse.Model);
        var plugin = kernel.Plugins["CodeAnalysis"]["AnalyzeCatalogue"];

        var fileKernel = KernelFactory.GetKernel(warehouse.OpenAIEndpoint,
            warehouse.OpenAIKey, path, warehouse.Model, false);

        OpenAIPromptExecutionSettings settings = new()
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
            ResponseFormat = typeof(DocumentResultCatalogue),
            Temperature = 0.5,
        };

        var catalogue = new StringBuilder();

        foreach (var info in pathInfos)
        {
            // 删除前缀 Constant.GitPath
            var relativePath = info.Path.Replace(path, "").TrimStart('\\');
            catalogue.Append($"{relativePath}\n");
        }

        var readme = await ReadMeFile(path);

        if (string.IsNullOrEmpty(readme))
        {
            // 生成README
            var generateReadmePlugin = kernel.Plugins["CodeAnalysis"]["GenerateReadme"];
            var generateReadme = await fileKernel.InvokeAsync(generateReadmePlugin, new KernelArguments(
                new OpenAIPromptExecutionSettings()
                {
                    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                    Temperature = 0.5,
                })
            {
                ["catalogue"] = catalogue.ToString()
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
        }


        var overview = await GenerateProjectOverview(fileKernel, catalogue.ToString(), readme);

        await dbContext.DocumentOverviews.Where(x => x.DocumentId == document.Id)
            .ExecuteDeleteAsync();

        await dbContext.DocumentOverviews.AddAsync(new DocumentOverview()
        {
            Content = overview,
            Title = "",
            DocumentId = document.Id,
            Id = Guid.NewGuid().ToString("N")
        });

        DocumentResultCatalogue? result = null;

        int retryCount = 0;
        const int maxRetries = 5;
        bool success = false;
        Exception exception = null;

        while (!success && retryCount < maxRetries)
        {
            try
            {
                var str = new StringBuilder();

                await foreach (var item in fileKernel.InvokeStreamingAsync(plugin, new KernelArguments(settings)
                               {
                                   ["catalogue"] = catalogue.ToString(),
                                   ["readme"] = readme
                               }))
                {
                    str.Append(item);
                }

                // 可能需要先处理一下documentation_structure 有些模型不支持json
                var regex = new Regex(@"<documentation_structure>(.*?)</documentation_structure>",
                    RegexOptions.Singleline);
                var match = regex.Match(str.ToString());

                if (match.Success)
                {
                    // 提取到的内容
                    var extractedContent = match.Groups[1].Value;
                    str.Clear();
                    str.Append(extractedContent);
                }

                result = JsonSerializer.Deserialize<DocumentResultCatalogue>(str.ToString());

                break;
            }
            catch (Exception ex)
            {
                Log.Logger.Warning("处理仓库；{path} ,处理标题：{name} 失败！", path, warehouse.Name);
                exception = ex;
                retryCount++;
                if (retryCount >= maxRetries)
                {
                    Console.WriteLine($"处理 {warehouse.Name} 失败，已重试 {retryCount} 次，错误：{ex.Message}");
                }
                else
                {
                    // 等待一段时间后重试
                    await Task.Delay(5000 * retryCount);
                }
            }
            finally
            {
            }
        }

        if (result == null)
        {
            // 尝试多次处理失败直接异常
            throw new Exception("处理失败，尝试五次无法成功：" + exception?.Message);
        }

        var documents = new List<DocumentCatalog>();
        // 递归处理目录层次结构
        ProcessCatalogueItems(result.Items, null, warehouse, document, documents);

        var documentFileItems = new ConcurrentBag<DocumentFileItem>();

        // 提供5个并发的信号量,很容易触发429错误
        var semaphore = new SemaphoreSlim(5);

        var tasks = new List<Task>();

        // 开始根据目录结构创建文档
        foreach (var item in documents)
        {
            tasks.Add(Task.Run(async () =>
            {
                int retryCount = 0;
                const int maxRetries = 10;
                bool success = false;

                while (!success && retryCount < maxRetries)
                {
                    try
                    {
                        Log.Logger.Information("处理仓库；{path} ,处理标题：{name}", path, item.Name);
                        await semaphore.WaitAsync();
                        var fileItem = await ProcessCatalogueItems(item, fileKernel, catalogue.ToString(), readme,
                            gitRepository);
                        documentFileItems.Add(fileItem);
                        success = true;

                        Log.Logger.Information("处理仓库；{path} ,处理标题：{name} 完成！", path, item.Name);
                        semaphore.Release();
                    }
                    catch (Exception ex)
                    {
                        semaphore.Release();
                        retryCount++;
                        if (retryCount >= maxRetries)
                        {
                            Console.WriteLine($"处理 {item.Name} 失败，已重试 {retryCount} 次，错误：{ex.Message}");
                        }
                        else
                        {
                            // 等待一段时间后重试
                            await Task.Delay(5000 * retryCount);
                        }
                    }
                    finally
                    {
                    }
                }
            }));
        }

        // 等待所有任务完成
        await Task.WhenAll(tasks);

        // 将解析的目录结构保存到数据库
        await dbContext.DocumentCatalogs.AddRangeAsync(documents);


        await dbContext.DocumentFileItems.AddRangeAsync(documentFileItems);

        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// 生成项目概述
    /// </summary>
    /// <returns></returns>
    private async Task<string> GenerateProjectOverview(Kernel kernel, string catalog,
        string readme)
    {
        var sr = new StringBuilder();

        var settings = new OpenAIPromptExecutionSettings()
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
        };

        var chat = kernel.GetRequiredService<IChatCompletionService>();
        var history = new ChatHistory();

        history.AddUserMessage(Prompt.Overview.Replace("{{$catalogue}}", catalog)
            .Replace("{{$readme}}", readme));

        await foreach (var item in chat.GetStreamingChatMessageContentsAsync(history, settings, kernel))
        {
            if (!string.IsNullOrEmpty(item.Content))
            {
                sr.Append(item.Content);
            }
        }

        // 使用正则表达式将<blog></blog>中的内容提取
        var regex = new Regex(@"<blog>(.*?)</blog>", RegexOptions.Singleline);

        var match = regex.Match(sr.ToString());

        if (match.Success)
        {
            // 提取到的内容
            var extractedContent = match.Groups[1].Value;
            sr.Clear();
            sr.Append(extractedContent);
        }

        return sr.ToString();
    }

    /// <summary>
    /// 处理每一个标题产生文件内容
    /// </summary>
    private async Task<DocumentFileItem> ProcessCatalogueItems(DocumentCatalog catalog, Kernel kernel, string catalogue,
        string readme, string git_repository)
    {
        var chat = kernel.Services.GetService<IChatCompletionService>();

        var history = new ChatHistory();

        history.AddUserMessage(Prompt.DefaultPrompt
            .Replace("{{$catalogue}}", catalogue)
            .Replace("{{$readme}}", readme)
            .Replace("{{$git_repository}}", git_repository)
            .Replace("{{$title}}", catalog.Name));


        var sr = new StringBuilder();

        await foreach (var i in chat.GetStreamingChatMessageContentsAsync(history, new OpenAIPromptExecutionSettings()
                       {
                           ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
                       }, kernel))
        {
            if (!string.IsNullOrEmpty(i.Content))
            {
                sr.Append(i.Content);
            }
        }

        // 使用正则表达式将<blog></blog>中的内容提取
        var regex = new Regex(@"<blog>(.*?)</blog>", RegexOptions.Singleline);

        var match = regex.Match(sr.ToString());

        if (match.Success)
        {
            // 提取到的内容
            var extractedContent = match.Groups[1].Value;
            sr.Clear();
            sr.Append(extractedContent);
        }

        var fileItem = new DocumentFileItem()
        {
            Content = sr.ToString(),
            DocumentCatalogId = catalog.Id,
            Description = string.Empty,
            Extra = new Dictionary<string, string>(),
            Metadata = new Dictionary<string, string>(),
            Source = [],
            CommentCount = 0,
            RequestToken = 0,
            CreatedAt = DateTime.Now,
            Id = Guid.NewGuid().ToString("N"),
            ResponseToken = 0,
            Size = 0,
            Title = catalog.Name,
        };

        return fileItem;
    }

    private void ProcessCatalogueItems(List<DocumentResultCatalogueItem> items, string? parentId, Warehouse warehouse,
        Document document, List<DocumentCatalog>? documents)
    {
        int order = 0; // 创建排序计数器
        foreach (var item in items)
        {
            var documentItem = new DocumentCatalog
            {
                WarehouseId = warehouse.Id,
                Description = item.title,
                Id = Guid.NewGuid().ToString("N"),
                Name = item.name,
                Url = item.title,
                DucumentId = document.Id,
                ParentId = parentId,
                Order = order++ // 为当前层级的每个项目设置顺序值并递增
            };

            documents.Add(documentItem);

            ProcessCatalogueItems(item.children.SelectMany(x => x.Items).ToList(), documentItem.Id, warehouse, document,
                documents);
        }
    }

    /// <summary>
    /// 读取仓库的ReadMe文件
    /// </summary>
    /// <returns></returns>
    private async Task<string> ReadMeFile(string path)
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

    void ScanDirectory(string directoryPath, List<PathInfo> infoList, string[] ignoreFiles)
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
            select new PathInfo { Path = file, Name = fileInfo.Name, Type = "File" });

        // 遍历所有目录，并递归扫描
        foreach (var directory in Directory.GetDirectories(directoryPath))
        {
            var dirName = Path.GetFileName(directory);

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

public class DocumentResultCatalogue
{
    public List<DocumentResultCatalogueItem> Items { get; set; } = new List<DocumentResultCatalogueItem>();
}

public class DocumentResultCatalogueItem
{
    public string name { get; set; }

    public string title { get; set; }

    public List<DocumentResultCatalogue> children { get; set; }
}

public class PathInfo
{
    public string Path { get; set; }

    public string Name { get; set; }

    public string Type { get; set; }
}