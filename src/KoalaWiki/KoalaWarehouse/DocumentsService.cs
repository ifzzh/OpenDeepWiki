﻿using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Entities;
using KoalaWiki.Entities.DocumentFile;
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
        var maxSize = Environment.GetEnvironmentVariable("TASK_MAX_SIZE_PER_USER");
        if (!string.IsNullOrEmpty(maxSize) && int.TryParse(maxSize, out var maxSizeInt))
        {
            TaskMaxSizePerUser = maxSizeInt;
        }
    }

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

    public async Task HandleAsync(Document document, Warehouse warehouse, IKoalaWikiContext dbContext,
        string gitRepository)
    {
        // 解析仓库的目录结构
        var path = document.GitPath;

        var ignoreFiles = GetIgnoreFiles(path);

        var pathInfos = new List<PathInfo>();
        // 递归扫描目录所有文件和目录
        ScanDirectory(path, pathInfos, ignoreFiles);

        var kernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey,
            path, OpenAIOptions.ChatModel);

        var fileKernel = KernelFactory.GetKernel(OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey, path, OpenAIOptions.ChatModel, false);

        var catalogue = new StringBuilder();

        foreach (var info in pathInfos)
        {
            // 删除前缀 Constant.GitPath
            var relativePath = info.Path.Replace(path, "").TrimStart('\\');

            // 过滤.开头的文件
            if (relativePath.StartsWith("."))
                continue;

            if (relativePath.Equals("README.md", StringComparison.OrdinalIgnoreCase) ||
                relativePath.Equals("README.txt", StringComparison.OrdinalIgnoreCase) ||
                relativePath.Equals("README", StringComparison.OrdinalIgnoreCase))
            {
                // 忽略README文件
                continue;
            }

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
                ["catalogue"] = catalogue.ToString(),
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
            var overview = await GenerateProjectOverview(fileKernel, catalogue.ToString(), readme, gitRepository,
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

        int retryCount = 0;
        const int maxRetries = 5;
        bool success = false;
        Exception exception = null;

        while (!success && retryCount < maxRetries)
        {
            try
            {
                var chat = kernel.Services.GetService<IChatCompletionService>();

                StringBuilder str = new StringBuilder();
                var history = new ChatHistory();
                history.AddUserMessage(Prompt.AnalyzeCatalogue
                    .Replace("{{$catalogue}}", catalogue.ToString())
                    .Replace("{{$readme}}", readme));

                await foreach (var item in chat.GetStreamingChatMessageContentsAsync(history,
                                   new OpenAIPromptExecutionSettings()
                                   {
                                       ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                                       Temperature = 0.5,
                                       MaxTokens = GetMaxTokens(OpenAIOptions.ChatModel),
                                   }, fileKernel))
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


                result = JsonConvert.DeserializeObject<DocumentResultCatalogue>(str.ToString().Trim());

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
        ProcessCatalogueItems(result.items, null, warehouse, document, documents);

        var documentFileItems = new ConcurrentBag<DocumentFileItem>();

        var documentFileSource = new ConcurrentDictionary<string, List<string>>();

        // 提供5个并发的信号量,很容易触发429错误
        var semaphore = new SemaphoreSlim(TaskMaxSizePerUser);

        var tasks = new List<Task>();

        // 开始根据目录结构创建文档
        foreach (var item in documents)
        {
            tasks.Add(Task.Run(async () =>
            {
                int retryCount = 0;
                const int retries = 5;
                bool success = false;

                // 收集所有引用源文件
                var files = new List<string>();
                DocumentContext.DocumentStore = new DocumentStore();

                while (!success && retryCount < retries)
                {
                    try
                    {
                        await semaphore.WaitAsync();
                        Log.Logger.Information("处理仓库；{path} ,处理标题：{name}", path, item.Name);
                        var fileItem = await ProcessCatalogueItems(item, fileKernel, catalogue.ToString(), readme,
                            gitRepository, warehouse.Branch);
                        documentFileItems.Add(fileItem);
                        success = true;

                        files.AddRange(DocumentContext.DocumentStore.Files);

                        documentFileSource.TryAdd(fileItem.Id, files);

                        Log.Logger.Information("处理仓库；{path} ,处理标题：{name} 完成！", path, item.Name);
                        semaphore.Release();
                    }
                    catch (Exception ex)
                    {
                        semaphore.Release();
                        retryCount++;
                        if (retryCount >= retries)
                        {
                            Console.WriteLine($"处理 {item.Name} 失败，已重试 {retryCount} 次，错误：{ex.Message}");
                        }
                        else
                        {
                            // 等待一段时间后重试
                            await Task.Delay(10000 * retryCount);
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

        if (Environment.GetEnvironmentVariable("REPAIR_MERMAID") == "1")
        {
            //修复Mermaid语法错误
            RepairMermaid(kernel, documentFileItems);
        }

        await dbContext.DocumentFileItems.AddRangeAsync(documentFileItems);
        // 批量添加fileSource

        foreach (var source in documentFileSource)
        {
            // warehouse.Address是仓库地址
            foreach (var fileItem in source.Value)
            {
                await dbContext.DocumentFileItemSources.AddAsync(new DocumentFileItemSource()
                {
                    Address = fileItem,
                    DocumentFileItemId = source.Key,
                    Name = fileItem,
                    Id = Guid.NewGuid().ToString("N"),
                });
            }
        }

        await dbContext.SaveChangesAsync();
    }

    private int GetMaxTokens(string model)
    {
        return model switch
        {
            "DeepSeek-V3" => 16384,
            "QwQ-32B" => 8192,
            "gpt-4.1-mini" => 32768,
            "gpt-4.1" => 32768,
            "gpt-4o" => 16384,
            "o4-mini" => 100000,
            "o3-mini" => 100000,
            _ => 16384
        };
    }

    /// <summary>
    /// Mermaid可能存在语法错误，使用大模型进行修复
    /// </summary>
    /// <param name="kernel"></param>
    /// <param name="documentFileItems"></param>
    private void RepairMermaid(Kernel kernel, ConcurrentBag<DocumentFileItem> documentFileItems)
    {
        foreach (var fileItem in documentFileItems)
        {
            try
            {
                string markdown = fileItem.Content;
                //这个markdown里面含有一部分mermaid语法，但是可能有错误，我需要提取 ``` mermaid  ```的节点，并重新使用大模型进行检查并替换
                //我的提示词是：检查mermaid语法是否有错误，并帮我修复，仅返回修复后的markdown内容：

                // 使用正则表达式匹配markdown中的mermaid代码块
                var regex = new Regex(@"```mermaid\s*([\s\S]*?)```", RegexOptions.Multiline);
                var matches = regex.Matches(markdown);

                if (matches.Count > 0)
                {
                    var chat = kernel.GetRequiredService<IChatCompletionService>();

                    foreach (Match match in matches)
                    {
                        string mermaidContent = match.Groups[1].Value.Trim();
                        string originalBlock = match.Value;

                        try
                        {
                            // 先校验mermaid语法是否正确，如果正确就不需要修复
                            if (string.IsNullOrEmpty(mermaidContent))
                            {
                                continue;
                            }

                            bool needsRepair = true;
                            try
                            {
                                // 使用Markdig解析Markdown
                                var pipeline = new MarkdownPipelineBuilder().Build();
                                var document = Markdown.Parse(originalBlock, pipeline);

                                // 检查是否有语法错误，查找所有代码块
                                var codeBlocks = document
                                    .Descendants<FencedCodeBlock>()
                                    .Where(block =>
                                        block.Info?.Equals("mermaid", StringComparison.OrdinalIgnoreCase) ?? false)
                                    .ToList();

                                // 如果找到了mermaid代码块并且它有内容
                                if (codeBlocks.Any() && codeBlocks[0].Lines.Count > 0)
                                {
                                    // Markdig至少成功解析了代码块结构，但可能内部语法还有问题
                                    // 由于Markdig不验证mermaid语法本身，我们可能需要其他方式验证
                                    // 或者直接使用AI修复所有mermaid块
                                    needsRepair = false;
                                }
                            }
                            catch
                            {
                                // 解析失败，需要修复
                                needsRepair = true;
                            }

                            if (!needsRepair)
                            {
                                continue;
                                ;
                            }


                            var history = new ChatHistory();

                            history.AddUserMessage(Prompt.RepairMermaid
                                .Replace("{{$mermaidContent}}", mermaidContent));

                            var settings = new OpenAIPromptExecutionSettings
                            {
                                Temperature = 0
                            };

                            var response = chat.GetChatMessageContentAsync(history, settings, kernel).Result;

                            if (!string.IsNullOrEmpty(response?.Content))
                            {
                                // 提取修复后的mermaid代码（去除可能的```mermaid和```）
                                string fixedContent = response.Content.Trim();
                                fixedContent = Regex.Replace(fixedContent, @"^```mermaid\s*", "",
                                    RegexOptions.Multiline);
                                fixedContent = Regex.Replace(fixedContent, @"\s*```$", "", RegexOptions.Multiline);

                                // 创建新的mermaid代码块
                                string newBlock = $"```mermaid\n{fixedContent}\n```";

                                // 替换原始内容
                                markdown = markdown.Replace(originalBlock, newBlock);
                                Log.Information("修复mermaid");
                            }
                        }
                        catch (Exception ex)
                        {
                            // 发生错误时记录但继续处理其他mermaid块
                            Log.Error($"修复Mermaid语法时出错: {ex.Message}");
                        }
                    }

                    // 更新文件内容
                    fileItem.Content = markdown;
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "修复mermaid语法失败");
            }
        }
    }

    /// <summary>
    /// 生成更新日志
    /// </summary>
    public async Task<(string content, string committer)> GenerateUpdateLogAsync(string gitPath,
        string readme, string git_repository, string branch, Kernel kernel)
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

            // commitMessage += "修改文件列表\n<file>\n";
            // // 扫码更改的文件
            // commit.Tree.Select(x => x.Path).ToList().ForEach(x => { commitMessage += x + "\n"; });
            // commitMessage += "</file>";

            commitMessage += "\n提交时间：" + commit.Committer.When.ToString("yyyy-MM-dd HH:mm:ss") + "\n";
        }

        var plugin = kernel.Plugins["CodeAnalysis"]["CommitAnalyze"];

        var str = string.Empty;
        await foreach (var item in kernel.InvokeStreamingAsync(plugin, new KernelArguments()
                       {
                           ["readme"] = readme,
                           ["git_repository"] = git_repository,
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
    private async Task<string> GenerateProjectOverview(Kernel kernel, string catalog,
        string readme, string gitRepository, string branch)
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
            .Replace("{{$branch}}", branch)
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
        string readme, string git_repository, string branch)
    {
        var chat = kernel.Services.GetService<IChatCompletionService>();

        var history = new ChatHistory();

        history.AddUserMessage(Prompt.DefaultPrompt
            .Replace("{{$catalogue}}", catalogue)
            .Replace("{{$prompt}}", catalog.Prompt)
            .Replace("{{$readme}}", readme)
            .Replace("{{$git_repository}}", git_repository)
            .Replace("{{$branch}}", branch)
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
                Prompt = item.prompt,
                Order = order++ // 为当前层级的每个项目设置顺序值并递增
            };

            documents.Add(documentItem);

            ProcessCatalogueItems(item.children.ToList(), documentItem.Id, warehouse, document,
                documents);
        }
    }

    private void ProcessCatalogueItems(List<DocumentResultCatalogueChildItem> items, string parentId,
        Warehouse warehouse, Document document, List<DocumentCatalog> documents)
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
                Prompt = item.prompt,
                Order = order++
            };

            documents.Add(documentItem);
            ProcessCatalogueItems1(item.children.ToList(), documentItem.Id, warehouse, document,
                documents);
        }
    }

    private void ProcessCatalogueItems1(List<DocumentResultCatalogueChildItem1> items, string parentId,
        Warehouse warehouse, Document document, List<DocumentCatalog> documents)
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
                Prompt = item.prompt,
                ParentId = parentId,
                Order = order++
            };

            documents.Add(documentItem);
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