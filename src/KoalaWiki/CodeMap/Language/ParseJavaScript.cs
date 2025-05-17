using System.Text.RegularExpressions;

namespace KoalaWiki.CodeMap.Language;

public class ParseJavaScript
{
    

    /// <summary>
    /// 解析TypeScript代码
    /// </summary>
    public static List<CodeSegment> ParseTypeScriptCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 匹配接口定义
            var interfacePattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?interface\s+(?<name>\w+)(?:\s+extends\s+(?<base>[\w\s,]+))?\s*{";
            var interfaceMatches = Regex.Matches(code, interfacePattern);

            foreach (Match match in interfaceMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取TSDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJsDocComment(match.Groups["docstring"].Value)
                    : "";

                string interfaceName = match.Groups["name"].Value;
                string baseInterfaces = match.Groups["base"].Success ? match.Groups["base"].Value : "";

                // 查找接口的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string interfaceCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(baseInterfaces))
                {
                    dependencies.AddRange(baseInterfaces.Split(',').Select(b => b.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Interface",
                    Name = interfaceName,
                    Code = interfaceCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docString,
                    Dependencies = dependencies
                });
            }

            // 匹配类型定义
            var typePattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?type\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,]+)>)?\s*=";
            var typeMatches = Regex.Matches(code, typePattern);

            foreach (Match match in typeMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取TSDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJsDocComment(match.Groups["docstring"].Value)
                    : "";

                string typeName = match.Groups["name"].Value;
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";

                // 查找类型定义的结束位置（通常是分号）
                int endPos = code.IndexOf(';', startPos);
                if (endPos == -1) endPos = code.Length - 1;
                int endLine = ParseCode.GetLineNumber(code, endPos);

                string typeCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Type Definition",
                    Name = typeName,
                    Code = typeCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docString,
                    Parameters = typeParams
                });
            }

            // 匹配枚举定义
            var enumPattern = @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?enum\s+(?<name>\w+)\s*{";
            var enumMatches = Regex.Matches(code, enumPattern);

            foreach (Match match in enumMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取TSDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJsDocComment(match.Groups["docstring"].Value)
                    : "";

                string enumName = match.Groups["name"].Value;

                // 查找枚举的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string enumCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Enum",
                    Name = enumName,
                    Code = enumCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docString
                });
            }

            // 添加JavaScript解析的结果（类、函数等）
            segments.AddRange(ParseJavaScriptCode(code));
        }
        catch (Exception ex)
        {
            segments = ParseCode.SplitByLines(code, 50); // 回退到简单分割
        }

        return segments;
    }

    
    /// <summary>
    /// 解析JavaScript代码
    /// </summary>
    public static List<CodeSegment> ParseJavaScriptCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 匹配ES6类定义
            var classPattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?class\s+(?<name>\w+)(?:\s+extends\s+(?<base>\w+))?\s*{";
            var classMatches = Regex.Matches(code, classPattern);

            foreach (Match match in classMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取JSDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJsDocComment(match.Groups["docstring"].Value)
                    : "";

                string className = match.Groups["name"].Value;
                string baseClass = match.Groups["base"].Success ? match.Groups["base"].Value : "";

                // 查找类的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string classCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(baseClass))
                {
                    dependencies.Add(baseClass);
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

            // 匹配函数定义（包括箭头函数和方法）
            var functionPatterns = new[]
            {
                // 标准函数声明
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?function\s+(?<name>\w+)\s*\((?<params>.*?)\)",

                // 箭头函数赋值
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:const|let|var)\s+(?<name>\w+)\s*=\s*(?:\((?<params>.*?)\)|(?<params>\w+))\s*=>",

                // 对象方法
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?<name>\w+)\s*(?:\((?<params>.*?)\)|(?<params>\w+))\s*{",

                // 类方法
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:async\s+)?(?<name>\w+)\s*\((?<params>.*?)\)\s*{"
            };

            foreach (var pattern in functionPatterns)
            {
                var functionMatches = Regex.Matches(code, pattern);

                foreach (Match match in functionMatches)
                {
                    int startPos = match.Index;
                    int startLine = ParseCode.GetLineNumber(code, startPos);

                    // 提取JSDoc注释
                    string docString = match.Groups["docstring"].Success
                        ? CleanJsDocComment(match.Groups["docstring"].Value)
                        : "";

                    string functionName = match.Groups["name"].Value;
                    string parameters = match.Groups["params"].Value;

                    // 查找函数的结束位置
                    int endLine = ParseCode.FindClosingBrace(code, startPos);
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
                        Dependencies = dependencies.Distinct().ToList()
                    });
                }
            }

            // 匹配React组件（函数组件）
            var reactComponentPattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?:export\s+)?const\s+(?<name>\w+)\s*=\s*(?:\((?<props>.*?)\)|(?<props>\w+))\s*=>";
            var reactComponentMatches = Regex.Matches(code, reactComponentPattern);

            foreach (Match match in reactComponentMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取JSDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJsDocComment(match.Groups["docstring"].Value)
                    : "";

                string componentName = match.Groups["name"].Value;
                string props = match.Groups["props"].Value;

                // 查找组件的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string componentCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "React Component",
                    Name = componentName,
                    Code = componentCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docString,
                    Parameters = props
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
    /// 清理JSDoc注释
    /// </summary>
    private static string CleanJsDocComment(string comment)
    {
        return Regex.Replace(comment, @"^\s*\*\s*", "", RegexOptions.Multiline).Trim();
    }

}