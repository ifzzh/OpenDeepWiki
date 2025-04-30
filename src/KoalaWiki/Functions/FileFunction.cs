using System.ComponentModel;
using Microsoft.SemanticKernel;

namespace KoalaWiki.Functions;

public class FileFunction(string gitPath)
{
    [KernelFunction, Description("读取指定的文件内容")]
    public async Task<string> ReadFileAsync(
        [Description("文件路径")] string filePath)
    {
        try
        {
            filePath = Path.Combine(gitPath, filePath.TrimStart('/'));
            Console.WriteLine($"Reading file: {filePath}");
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