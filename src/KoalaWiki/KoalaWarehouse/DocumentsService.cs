using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.Entities.DocumentFile;
using KoalaWiki.Extensions;
using KoalaWiki.Functions;
using KoalaWiki.Options;
using LibGit2Sharp;
using Markdig;
using Markdig.Syntax;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Newtonsoft.Json;
using Serilog;

namespace KoalaWiki.KoalaWarehouse;

public class DocumentsService
{
    private static readonly int TaskMaxSizePerUser = 5;

    static DocumentsService()
    {
        // 读取环境变量
        var maxSize = Environment.GetEnvironmentVariable("TASK_MAX_SIZE_PER_USER").GetTrimmedValueOrEmpty();
        if (!string.IsNullOrEmpty(maxSize) && int.TryParse(maxSize, out var maxSizeInt))
        {
            TaskMaxSizePerUser = maxSizeInt;
        }
    }

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
                .Select(x => x.Trim()).ToArray();

            return ignoreFiles;
        }

        return [];
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

        return catalogue.ToString();
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

        var catalogue = GetCatalogue(path);

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
                ["catalogue"] = catalogue,
                ["git_repository"] = gitRepository,
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
        }

        await dbContext.DocumentCommitRecords.Where(x => x.WarehouseId == warehouse.Id)
            .ExecuteDeleteAsync();


        // 开始生成
        var (git, committer) = await GenerateUpdateLogAsync(document.GitPath, readme,
            warehouse.Address,
            warehouse.Branch,
            kernel);

        await dbContext.DocumentCommitRecords.AddAsync(new DocumentCommitRecord()
        {
            WarehouseId = warehouse.Id,
            CreatedAt = DateTime.Now,
            Author = committer,
            Id = Guid.NewGuid().ToString("N"),
            CommitMessage = git,
            LastUpdate = DateTime.Now,
        });

        if (await dbContext.DocumentOverviews.AnyAsync(x => x.DocumentId == document.Id) == false)
        {
            var overview = await GenerateProjectOverview(fileKernel, catalogue, gitRepository,
                warehouse.Branch);

            // 可能需要先处理一下documentation_structure 有些模型不支持json
            var regex = new Regex(@"<blog>(.*?)</blog>",
                RegexOptions.Singleline);
            var match = regex.Match(overview);

            if (match.Success)
            {
                // 提取到的内容
                overview = match.Groups[1].Value;
            }

            await dbContext.DocumentOverviews.AddAsync(new DocumentOverview()
            {
                Content = overview,
                Title = "",
                DocumentId = document.Id,
                Id = Guid.NewGuid().ToString("N")
            });
        }

        DocumentResultCatalogue? result = null;

        var retryCount = 0;
        const int maxRetries = 5;
        Exception? exception = null;

        while (retryCount < maxRetries)
        {
            try
            {
                var analysisModel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
                    OpenAIOptions.ChatApiKey, path, OpenAIOptions.AnalysisModel, false);

                var chat = analysisModel.Services.GetService<IChatCompletionService>();

                StringBuilder str = new StringBuilder();
                var history = new ChatHistory();
                history.AddUserMessage(Prompt.AnalyzeCatalogue
                        .Replace("{{code_files}}", catalogue)
                        .Replace("{{repository_name}}", warehouse.Name))
                    ;
                await foreach (var item in chat.GetStreamingChatMessageContentsAsync(history,
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       ToolCallBehavior = ToolCallBehavior.RequireFunction(
                                           analysisModel.Plugins["FileFunction"]["ReadFiles"].Metadata
                                               .ToOpenAIFunction(), true),
                                       Temperature = 0.5,
                                       MaxTokens = GetMaxTokens(OpenAIOptions.AnalysisModel)
                                   }, analysisModel))
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

                try
                {
                    result = JsonConvert.DeserializeObject<DocumentResultCatalogue>(str.ToString().Trim());
                }
                catch (Exception ex)
                {
                    Log.Logger.Error("反序列化失败: {ex}, 原始字符串: {str}", ex.ToString(), str.ToString().Trim());
                    throw;
                }

                break;
            }
            catch (Exception ex)
            {
                Log.Logger.Warning("处理仓库；{path} ,处理标题：{name} 失败:{ex}", path, warehouse.Name, ex.ToString());
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
        ProcessCatalogueItems(result.items, null, warehouse, document, documents);

        documents.ForEach(x => x.IsCompleted = false);

        // 删除遗留数据
        await dbContext.DocumentCatalogs.Where(x => x.WarehouseId == warehouse.Id)
            .ExecuteDeleteAsync();

        // 将解析的目录结构保存到数据库
        await dbContext.DocumentCatalogs.AddRangeAsync(documents);

        await dbContext.SaveChangesAsync();

        // 提供5个并发的信号量,很容易触发429错误
        var semaphore = new SemaphoreSlim(TaskMaxSizePerUser);

        // 等待中的任务列表
        var pendingDocuments = new ConcurrentBag<DocumentCatalog>(documents);
        var runningTasks = new List<Task<(DocumentCatalog catalog, DocumentFileItem fileItem, List<string> files)>>();

        // 开始处理文档，直到所有文档都处理完成
        while (pendingDocuments.Count > 0 || runningTasks.Count > 0)
        {
            // 尝试启动新任务，直到达到并发限制
            while (pendingDocuments.Count > 0 && runningTasks.Count < TaskMaxSizePerUser)
            {
                if (!pendingDocuments.TryTake(out var documentCatalog)) continue;

                var task = ProcessDocumentAsync(documentCatalog, fileKernel, catalogue, gitRepository,
                    warehouse.Branch, path, semaphore);
                runningTasks.Add(task);
            }

            // 如果没有正在运行的任务，退出循环
            if (runningTasks.Count == 0)
                break;

            // 等待任意一个任务完成
            var completedTask = await Task.WhenAny(runningTasks);
            runningTasks.Remove(completedTask);

            try
            {
                var (catalog, fileItem, files) = await completedTask;

                if (fileItem == null)
                {
                    // 构建失败
                    Log.Logger.Error("处理仓库；{path} ,处理标题：{name} 失败:文件内容为空", path, catalog.Name);

                    throw new Exception("处理失败，文件内容为空: " + catalog.Name);
                }

                // 更新文档状态
                await dbContext.DocumentCatalogs.Where(x => x.Id == catalog.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(y => y.IsCompleted, true));

                // 修复Mermaid语法错误
                RepairMermaid(fileItem);

                await dbContext.DocumentFileItems.AddAsync(fileItem);
                await dbContext.DocumentFileItemSources.AddRangeAsync(files.Select(x => new DocumentFileItemSource()
                {
                    Address = x,
                    DocumentFileItemId = fileItem.Id,
                    Name = x,
                    Id = Guid.NewGuid().ToString("N"),
                }));

                await dbContext.SaveChangesAsync();

                Log.Logger.Information("处理仓库；{path}, 处理标题：{name} 完成并保存到数据库！", path, catalog.Name);
            }
            catch (Exception ex)
            {
                Log.Logger.Error("处理文档失败: {ex}", ex.ToString());
            }
        }
    }

    /// <summary>
    /// 处理单个文档的异步方法
    /// </summary>
    private async Task<(DocumentCatalog catalog, DocumentFileItem fileItem, List<string> files)> ProcessDocumentAsync(
        DocumentCatalog catalog, Kernel kernel, string catalogue, string gitRepository, string branch, string path,
        SemaphoreSlim semaphore)
    {
        int retryCount = 0;
        const int retries = 5;
        var files = new List<string>();
        DocumentContext.DocumentStore = new DocumentStore();

        while (true)
        {
            try
            {
                await semaphore.WaitAsync();
                Log.Logger.Information("处理仓库；{path} ,处理标题：{name}", path, catalog.Name);
                var fileItem = await ProcessCatalogueItems(catalog, kernel, catalogue, gitRepository, branch, path);
                files.AddRange(DocumentContext.DocumentStore.Files);

                Log.Logger.Information("处理仓库；{path} ,处理标题：{name} 完成！", path, catalog.Name);
                semaphore.Release();

                return (catalog, fileItem, files);
            }
            catch (Exception ex)
            {
                Log.Logger.Error("处理仓库；{path} ,处理标题：{name} 失败:{ex}", path, catalog.Name, ex.ToString());
                semaphore.Release();
                retryCount++;
                if (retryCount >= retries)
                {
                    Console.WriteLine($"处理 {catalog.Name} 失败，已重试 {retryCount} 次，错误：{ex.Message}");
                    throw; // 重试耗尽后向上层抛出异常
                }
                else
                {
                    // 等待一段时间后重试
                    await Task.Delay(10000 * retryCount);
                }
            }
        }

        // 不应该执行到这里，因为要么成功返回，要么抛出异常
        throw new Exception($"处理文档 {catalog.Name} 失败");
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static int GetMaxTokens(string model)
    {
        return model switch
        {
            "deepseek-chat" => 8192,
            "DeepSeek-V3" => 16384,
            "QwQ-32B" => 8192,
            "gpt-4.1-mini" => 16384,
            "gpt-4.1" => 16384,
            "gpt-4o" => 16384,
            "o4-mini" => 16384,
            "doubao-1-5-pro-256k-250115" => 12288,
            "o3-mini" => 16384,
            "Qwen/Qwen3-235B-A22B" => 16384,
            "grok-3" => 65536,
            "qwen3-235b-a22b" => 16384,
            "gemini-2.5-pro-preview-05-06" => 16384,
            _ => 8192
        };
    }

    /// <summary>
    /// Mermaid可能存在语法错误，使用大模型进行修复
    /// </summary>
    /// <param name="fileItem"></param>
    private void RepairMermaid(DocumentFileItem fileItem)
    {
        try
        {
            var regex = new Regex(@"```mermaid\s*([\s\S]*?)```", RegexOptions.Multiline);
            var matches = regex.Matches(fileItem.Content);

            foreach (Match match in matches)
            {
                var code = match.Groups[1].Value;

                // 只需要删除[]里面的(和)，它可能单独处理
                var codeWithoutBrackets =
                    Regex.Replace(code, @"\[[^\]]*\]", m => m.Value.Replace("(", "").Replace(")", ""));
                // 然后替换原有内容
                fileItem.Content = fileItem.Content.Replace(match.Value, $"```mermaid\n{codeWithoutBrackets}```");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "修复mermaid语法失败");
        }
    }

    /// <summary>
    /// 生成更新日志
    /// </summary>
    public async Task<(string content, string committer)> GenerateUpdateLogAsync(string gitPath,
        string readme, string gitRepositoryUrl, string branch, Kernel kernel)
    {
        // 读取git log
        using var repo = new Repository(gitPath, new RepositoryOptions());

        var log = repo.Commits
            .OrderByDescending(x => x.Committer.When)
            // 只要最近的10条
            .Take(20)
            .OrderBy(x => x.Committer.When)
            .ToList();

        string commitMessage = string.Empty;
        foreach (var commit in log)
        {
            commitMessage += "提交人：" + commit.Committer.Name + "\n提交内容\n<message>\n" + commit.Message +
                             "<message>";

            commitMessage += "\n提交时间：" + commit.Committer.When.ToString("yyyy-MM-dd HH:mm:ss") + "\n";
        }

        var plugin = kernel.Plugins["CodeAnalysis"]["CommitAnalyze"];

        var str = string.Empty;
        await foreach (var item in kernel.InvokeStreamingAsync(plugin, new KernelArguments()
                       {
                           ["readme"] = readme,
                           ["git_repository"] = gitRepositoryUrl,
                           ["commit_message"] = commitMessage,
                           ["branch"] = branch
                       }))
        {
            str += item;
        }

        var regex = new Regex(@"<changelog>(.*?)</changelog>",
            RegexOptions.Singleline);
        var match = regex.Match(str);

        if (match.Success)
        {
            // 提取到的内容
            str = match.Groups[1].Value;
        }

        // 获取最近一次提交
        var lastCommit = log.First();
        return (str, lastCommit.Committer.Name);
    }

    /// <summary>
    /// 生成项目概述
    /// </summary>
    /// <returns></returns>
    private async Task<string> GenerateProjectOverview(Kernel kernel, string catalog, string gitRepository,
        string branch)
    {
        var sr = new StringBuilder();

        var settings = new OpenAIPromptExecutionSettings()
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
        };

        var chat = kernel.GetRequiredService<IChatCompletionService>();
        var history = new ChatHistory();

        history.AddUserMessage(Prompt.Overview.Replace("{{$catalogue}}", catalog)
            .Replace("{{$git_repository}}", gitRepository)
            .Replace("{{$branch}}", branch));

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
        string gitRepository, string branch, string path)
    {
        var chat = kernel.Services.GetService<IChatCompletionService>();

        var history = new ChatHistory();

        history.AddUserMessage(Prompt.GenerateDocs
            .Replace("{{catalogue}}", catalogue)
            .Replace("{{prompt}}", catalog.Prompt)
            .Replace("{{git_repository}}", gitRepository)
            .Replace("{{branch}}", branch)
            .Replace("{{title}}", catalog.Name));

        var fileFunction = new FileFunction(path);
        history.AddUserMessage(await fileFunction.ReadFilesAsync(catalog.DependentFile.ToArray()));

        var sr = new StringBuilder();

        await foreach (var i in chat.GetStreamingChatMessageContentsAsync(history, new OpenAIPromptExecutionSettings()
                       {
                           ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                           MaxTokens = GetMaxTokens(OpenAIOptions.ChatModel),
                           Temperature = 0.5,
                       }, kernel))
        {
            if (!string.IsNullOrEmpty(i.Content))
            {
                sr.Append(i.Content);
            }
        }
        
        // 擅长<thought_process></thought_process>标签的内容包括标签
        var thought_process = new Regex(@"<thought_process>(.*?)</thought_process>", RegexOptions.Singleline);
        var thought_process_match = thought_process.Match(sr.ToString());
        if (thought_process_match.Success)
        {
            // 提取到的内容
            var extractedContent = thought_process_match.Groups[1].Value;
            sr.Clear();
            sr.Append(extractedContent);
        }
        

        // 使用正则表达式将<blog></blog>中的内容提取
        var regex = new Regex(@"<data-blog>(.*?)</data-blog>", RegexOptions.Singleline);

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
                DependentFile = item.dependent_file.ToList(),
                Id = Guid.NewGuid().ToString("N"),
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

    static void ScanDirectory(string directoryPath, List<PathInfo> infoList, string[] ignoreFiles)
    {
        // 遍历所有文件
        infoList.AddRange(from file in Directory.GetFiles(directoryPath).Where(file =>
            {
                var filename = Path.GetFileName(file);

                if (file.StartsWith("."))
                {
                    // 忽略以.开头的文件
                    return false;
                }

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
            where fileInfo.Length < 1024 * 1024 * 1
            where !file.EndsWith(".png", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".bmp", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".dll", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".so", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".class", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".o", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".a", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".tar", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".gz", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".bz2", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".xz", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".mp3", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".wav", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".flac", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".aac", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".ogg", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".avi", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".mkv", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".mov", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".wmv", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".doc", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".docx", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".ppt", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".pptx", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".xls", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".css", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".scss", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".less", StringComparison.OrdinalIgnoreCase)
            where !file.EndsWith(".html", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".htm", StringComparison.OrdinalIgnoreCase)
            // 过滤.ico
            where !file.EndsWith(".ico", StringComparison.OrdinalIgnoreCase) &&
                  !file.EndsWith(".svg", StringComparison.OrdinalIgnoreCase)
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