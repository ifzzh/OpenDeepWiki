using System.Text.RegularExpressions;

namespace KoalaWiki.CodeMap.Language;

public class ParsePython
{
    /// <summary>
    /// 解析Python代码
    /// </summary>
    public static List<CodeSegment> ParsePythonCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 使用正则表达式匹配类定义
            var classPattern =
                @"(?:^|\n)(?<docstring>(?:'''[\s\S]*?'''|\""\""\""[\s\S]*?\""\""\""))?\s*class\s+(?<name>\w+)(?:\((?<base>.*?)\))?\s*:";
            var classMatches = Regex.Matches(code, classPattern, RegexOptions.Multiline);

            foreach (Match match in classMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取文档字符串
                string docString = match.Groups["docstring"].Success
                    ? match.Groups["docstring"].Value.Trim('\'', '"', ' ', '\r', '\n')
                    : "";

                string className = match.Groups["name"].Value;
                string baseClasses = match.Groups["base"].Success ? match.Groups["base"].Value : "";

                // 查找类的结束位置（基于缩进）
                int endLine = FindPythonBlockEnd(code, startLine);
                string classCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(baseClasses))
                {
                    dependencies.AddRange(baseClasses.Split(',').Select(b => b.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Class",
                    Name = className,
                    Code = classCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docString,
                    Dependencies = dependencies
                });
            }

            // 匹配函数定义
            var functionPattern =
                @"(?:^|\n)(?<docstring>(?:'''[\s\S]*?'''|\""\""\""[\s\S]*?\""\""\""))?\s*def\s+(?<name>\w+)\s*\((?<params>.*?)\)\s*(?:->(?<return>.*?))?\s*:";
            var functionMatches = Regex.Matches(code, functionPattern, RegexOptions.Multiline);

            foreach (Match match in functionMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取文档字符串
                string docString = match.Groups["docstring"].Success
                    ? match.Groups["docstring"].Value.Trim('\'', '"', ' ', '\r', '\n')
                    : "";

                string functionName = match.Groups["name"].Value;
                string parameters = match.Groups["params"].Value;
                string returnType = match.Groups["return"].Success ? match.Groups["return"].Value.Trim() : "";

                // 查找函数的结束位置（基于缩进）
                int endLine = FindPythonBlockEnd(code, startLine);
                string functionCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                // 检查是否是类方法
                string className = "";
                bool isMethod = false;

                // 检查函数是否在类中
                foreach (var segment in segments.Where(s => s.Type == "Class"))
                {
                    if (startLine > segment.StartLine && endLine < segment.EndLine)
                    {
                        className = segment.Name;
                        isMethod = true;
                        break;
                    }
                }

                // 提取函数调用的依赖项
                var functionBodyLines = functionCode.Split('\n').Skip(1).ToList(); // 跳过函数定义行
                var dependencies = new List<string>();

                foreach (var line in functionBodyLines)
                {
                    // 简单匹配函数调用
                    var callMatches = Regex.Matches(line, @"(?<!\w)(\w+)\s*\(");
                    foreach (Match callMatch in callMatches)
                    {
                        dependencies.Add(callMatch.Groups[1].Value);
                    }
                }

                segments.Add(new CodeSegment
                {
                    Type = isMethod ? "Method" : "Function",
                    Name = functionName,
                    Code = functionCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    ClassName = className,
                    Documentation = docString,
                    Parameters = parameters,
                    ReturnType = returnType,
                    Dependencies = dependencies.Distinct().ToList()
                });
            }

            // 如果没有找到任何结构，以固定行数分段
            if (segments.Count == 0)
            {
                segments = ParseCode.SplitByLines(code, 50);
            }
        }
        catch (Exception ex)
        {
            segments = ParseCode.SplitByLines(code, 50); // 回退到简单分割
        }

        return segments;
    }
    
    /// <summary>
    /// 查找Python代码块结束位置（基于缩进）
    /// </summary>
    private static int FindPythonBlockEnd(string code, int startLine)
    {
        var lines = code.Split('\n');
        if (startLine >= lines.Length)
            return startLine;

        string startLineText = lines[startLine - 1];
        int startIndent = startLineText.Length - startLineText.TrimStart().Length;

        for (int i = startLine; i < lines.Length; i++)
        {
            string line = lines[i];
            if (line.Trim().Length == 0) continue; // 跳过空行

            int indent = line.Length - line.TrimStart().Length;
            if (indent <= startIndent)
                return i;
        }

        return lines.Length;
    }

}