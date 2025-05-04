using System.ComponentModel;
using KoalaWiki.KoalaWarehouse;
using Microsoft.SemanticKernel;

namespace KoalaWiki.Functions;

public class FileFunction(string gitPath)
{
    [KernelFunction, Description("读取指定的文件内容")]
    [return: Description("返回字典，key是目录名称")]
    public async Task<Dictionary<string, string>> ReadFilesAsync(
        [Description("文件路径")] string[] filePaths)
    {
        try
        {
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
                if (info.Length > 1024 * 1024 * 1)
                {
                    throw new Exception($"File too large: {item} ({info.Length / 1024 / 1024}MB)");
                }

                await using var stream = new FileStream(item, FileMode.Open, FileAccess.Read);
                using var reader = new StreamReader(stream);
                dic.Add(item, await reader.ReadToEndAsync());
            }

            return dic;
        }
        catch (Exception ex)
        {
            // 处理异常
            Console.WriteLine($"Error reading file: {ex.Message}");
            throw new Exception($"Error reading file: {ex.Message}");
        }
    }

    [KernelFunction, Description("读取指定的文件内容")]
    public async Task<string> ReadFileAsync(
        [Description("文件路径")] string filePath)
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
            if (info.Length > 1024 * 1024 * 1)
            {
                return $"File too large: {filePath} ({info.Length / 1024 / 1024}MB)";
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
    [KernelFunction, Description("从指定行数开始读取文件内容")]
    public async Task<string> ReadFileFromLineAsync(
        [Description("文件路径")] string filePath,
        [Description("开始行号")] int startLine = 0)
    {
        try
        {
            filePath = Path.Combine(gitPath, filePath.TrimStart('/'));
            Console.WriteLine($"Reading file from line {startLine}: {filePath}");
            var lines = await File.ReadAllLinesAsync(filePath);
            return string.Join(Environment.NewLine, lines.Skip(startLine));
        }
        catch (Exception ex)
        {
            // 处理异常
            Console.WriteLine($"Error reading file: {ex.Message}");
            return $"Error reading file: {ex.Message}";
        }
    }
}