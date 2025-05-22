using System.ComponentModel;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using CodeDependencyAnalyzer;
using KoalaWiki.KoalaWarehouse;
using Microsoft.SemanticKernel;
using Serilog;

namespace KoalaWiki.Functions;

public class FileFunction(string gitPath)
{
    [KernelFunction, Description("Read the specified file content")]
    [return: Description("Return the dictionary. The key is the directory name")]
    public async Task<string> ReadFilesAsync(
        [Description("File Path")] string[] filePaths)
    {
        try
        {
            filePaths = filePaths.Distinct().ToArray();

            if (DocumentContext.DocumentStore?.Files != null)
            {
                DocumentContext.DocumentStore.Files.AddRange(filePaths);
            }

            var dic = new Dictionary<string, string>();
            foreach (var filePath in filePaths)
            {
                var item = Path.Combine(gitPath, filePath.TrimStart('/'));
                if (!File.Exists(item))
                {
                    continue;
                }

                Console.WriteLine($"Reading file: {item}");

                var info = new FileInfo(item);

                // 判断文件大小
                if (info.Length > 1024 * 100)
                {
                    return
                        "If the file exceeds 100KB, you should use ReadFileFromLineAsync to read the file content line by line";
                }

                await using var stream = new FileStream(item, FileMode.Open, FileAccess.Read);
                using var reader = new StreamReader(stream);
                dic[filePath] = await reader.ReadToEndAsync();
            }

            return JsonSerializer.Serialize(dic, new JsonSerializerOptions()
            {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = true,
            });
        }
        catch (Exception ex)
        {
            // 处理异常
            Console.WriteLine($"Error reading file: {ex.Message}");
            throw new Exception($"Error reading file: {ex.Message}");
        }
    }
    //
    // /// <summary>
    // /// Analyzes the dependency tree of a specified function within a file.
    // /// </summary>
    // /// <param name="filePath">The path to the file containing the function to analyze.</param>
    // /// <param name="functionName">The name of the function to analyze for dependency relationships.</param>
    // /// <returns>A JSON string representing the dependency tree of the specified function.</returns>
    // [KernelFunction, Description("Analyze the dependency relationship of the specified method")]
    // [return: Description("Return the dependency tree of the specified function")]
    // public async Task<string> AnalyzeFunctionDependencyTree(
    //     [Description("File Path")] string filePath,
    //     [Description("Analyze the dependency relationship of the specified method")]
    //     string functionName)
    // {
    //     try
    //     {
    //         Log.Logger.Information($"ReadCodeFileAsync: {filePath} {functionName}");
    //
    //         var newPath = Path.Combine(gitPath, filePath.TrimStart('/'));
    //
    //         var code = new DependencyAnalyzer(gitPath);
    //
    //         var result = await code.AnalyzeFunctionDependencyTree(newPath, functionName);
    //
    //         return JsonSerializer.Serialize(result, JsonSerializerOptions.Web);
    //     }
    //     catch (Exception ex)
    //     {
    //         // 处理异常
    //         Console.WriteLine($"Error reading file: {ex.Message}");
    //         return $"Error reading file: {ex.Message}";
    //     }
    // }

    // /// <summary>
    // /// 分析指定文件的依赖关系
    // /// </summary>
    // /// <returns></returns>
    // [KernelFunction, Description("Analyze the dependency relationship of the specified file")]
    // [return: Description("Return the dependency tree of the specified file")]
    // public async Task<string> AnalyzeFileDependencyTree(
    //     [Description("File Path")] string filePath)
    // {
    //     try
    //     {
    //         Log.Logger.Information($"ReadCodeFileAsync: {filePath}");
    //
    //         var newPath = Path.Combine(gitPath, filePath.TrimStart('/'));
    //
    //         var code = new DependencyAnalyzer(gitPath);
    //
    //         var result = await code.AnalyzeFileDependencyTree(newPath);
    //
    //         return JsonSerializer.Serialize(result, JsonSerializerOptions.Web);
    //     }
    //     catch (Exception ex)
    //     {
    //         // 处理异常
    //         Console.WriteLine($"Error reading file: {ex.Message}");
    //         return $"Error reading file: {ex.Message}";
    //     }
    // }

    [KernelFunction, Description("Read the specified file content")]
    public async Task<string> ReadFileAsync(
        [Description("File Path")] string filePath)
    {
        try
        {
            if (DocumentContext.DocumentStore?.Files != null)
            {
                DocumentContext.DocumentStore.Files.Add(filePath);
            }

            filePath = Path.Combine(gitPath, filePath.TrimStart('/'));
            Console.WriteLine($"Reading file: {filePath}");

            var info = new FileInfo(filePath);
            // 判断文件是否存在
            if (!info.Exists)
            {
                return $"File not found: {filePath}";
            }

            // 判断文件大小
            if (info.Length > 1024 * 100)
            {
                return $"File too large: {filePath} ({info.Length / 1024 / 100}KB)";
            }

            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            using var reader = new StreamReader(stream);
            return await reader.ReadToEndAsync();
        }
        catch (Exception ex)
        {
            // 处理异常
            Console.WriteLine($"Error reading file: {ex.Message}");
            return $"Error reading file: {ex.Message}";
        }
    }

    /// <summary>
    /// 从指定行数开始读取文件内容
    /// </summary>
    /// <returns></returns>
    [KernelFunction, Description("Read the file content from the specified number of lines")]
    public async Task<string> ReadFileFromLineAsync(
        [Description("File Path")] string filePath,
        [Description("Start Line Number")] int startLine = 0,
        [Description("End Line Number")] int endLine = 10)
    {
        try
        {
            filePath = Path.Combine(gitPath, filePath.TrimStart('/'));
            Console.WriteLine($"Reading file from line {startLine}: {filePath}");
            var lines = await File.ReadAllLinesAsync(filePath);

            if (startLine < 0 || startLine >= lines.Length)
            {
                return $"Invalid start line: {startLine}";
            }

            if (endLine < startLine || endLine >= lines.Length)
            {
                return $"Invalid end line: {endLine}";
            }

            var result = new StringBuilder();
            for (var i = startLine; i <= endLine; i++)
            {
                result.AppendLine(lines[i]);
            }

            return result.ToString();
        }
        catch (Exception ex)
        {
            // 处理异常
            Console.WriteLine($"Error reading file: {ex.Message}");
            return $"Error reading file: {ex.Message}";
        }
    }
}