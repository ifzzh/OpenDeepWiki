using System.Text.RegularExpressions;

namespace KoalaWiki.CodeMap.Language;

public class ParseJava
{
    /// <summary>
    /// 解析Java代码
    /// </summary>
    public static List<CodeSegment> ParseJavaCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 匹配包声明
            var packagePattern = @"package\s+(?<name>[\w\.]+)\s*;";
            var packageMatch = Regex.Match(code, packagePattern);
            string packageName = packageMatch.Success ? packageMatch.Groups["name"].Value : "";

            // 匹配导入语句
            var importPattern = @"import\s+(?:static\s+)?(?<name>[\w\.]+(?:\.\*)?)\s*;";
            var importMatches = Regex.Matches(code, importPattern);
            var imports = new List<string>();
            foreach (Match match in importMatches)
            {
                imports.Add(match.Groups["name"].Value);
            }

            // 匹配类定义
            var classPattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?<modifiers>(?:public|private|protected|static|final|abstract|synchronized|transient|volatile|native|strictfp|\s)+)?class\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>]+)>)?(?:\s+extends\s+(?<extends>\w+))?(?:\s+implements\s+(?<implements>[\w\s,]+))?";
            var classMatches = Regex.Matches(code, classPattern);

            foreach (Match match in classMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取JavaDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJavaDocComment(match.Groups["docstring"].Value)
                    : "";

                string className = match.Groups["name"].Value;
                string modifiers = match.Groups["modifiers"].Success ? match.Groups["modifiers"].Value.Trim() : "";
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
                string extendsClass = match.Groups["extends"].Success ? match.Groups["extends"].Value : "";
                string implementsInterfaces =
                    match.Groups["implements"].Success ? match.Groups["implements"].Value : "";

                // 查找类的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string classCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(extendsClass))
                {
                    dependencies.Add(extendsClass);
                }

                if (!string.IsNullOrEmpty(implementsInterfaces))
                {
                    dependencies.AddRange(implementsInterfaces.Split(',').Select(i => i.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Class",
                    Name = className,
                    Code = classCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Namespace = packageName,
                    Documentation = docString,
                    Dependencies = dependencies,
                    Modifiers = modifiers,
                    Parameters = typeParams // 泛型参数
                });
            }

            // 匹配方法定义
            var methodPattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?<modifiers>(?:public|private|protected|static|final|abstract|synchronized|transient|volatile|native|strictfp|\s)+)?(?<returnType>[\w<>\[\],\s\.]+)\s+(?<name>\w+)\s*\((?<params>.*?)\)(?:\s+throws\s+(?<throws>[\w\s,\.]+))?";
            var methodMatches = Regex.Matches(code, methodPattern);

            foreach (Match match in methodMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 检查是否是变量声明而不是方法
                string nextChar = code.Length > startPos + match.Length
                    ? code.Substring(startPos + match.Length, 1)
                    : "";
                if (nextChar == ";" || nextChar == "=")
                    continue; // 这可能是一个变量声明，不是方法

                // 提取JavaDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJavaDocComment(match.Groups["docstring"].Value)
                    : "";

                string methodName = match.Groups["name"].Value;
                string modifiers = match.Groups["modifiers"].Success ? match.Groups["modifiers"].Value.Trim() : "";
                string returnType = match.Groups["returnType"].Value.Trim();
                string parameters = match.Groups["params"].Value;
                string throwsExceptions = match.Groups["throws"].Success ? match.Groups["throws"].Value : "";

                // 查找方法的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string methodCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                // 检查是否是类方法
                string className = "";

                // 检查方法是否在类中
                foreach (var segment in segments.Where(s => s.Type == "Class"))
                {
                    if (startLine > segment.StartLine && endLine < segment.EndLine)
                    {
                        className = segment.Name;
                        break;
                    }
                }

                // 提取方法调用的依赖项
                var methodBodyLines = methodCode.Split('\n').Skip(1).ToList(); // 跳过方法定义行
                var dependencies = new List<string>();

                foreach (var line in methodBodyLines)
                {
                    // 简单匹配方法调用
                    var callMatches = Regex.Matches(line, @"(?<!\w)(\w+)\s*\(");
                    foreach (Match callMatch in callMatches)
                    {
                        dependencies.Add(callMatch.Groups[1].Value);
                    }
                }

                // 添加throws声明的异常类型
                if (!string.IsNullOrEmpty(throwsExceptions))
                {
                    dependencies.AddRange(throwsExceptions.Split(',').Select(e => e.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Method",
                    Name = methodName,
                    Code = methodCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Namespace = packageName,
                    ClassName = className,
                    Documentation = docString,
                    ReturnType = returnType,
                    Parameters = parameters,
                    Dependencies = dependencies.Distinct().ToList(),
                    Modifiers = modifiers
                });
            }

            // 匹配接口定义
            var interfacePattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?<modifiers>(?:public|private|protected|static|final|abstract|\s)+)?interface\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>]+)>)?(?:\s+extends\s+(?<extends>[\w\s,]+))?";
            var interfaceMatches = Regex.Matches(code, interfacePattern);

            foreach (Match match in interfaceMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取JavaDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJavaDocComment(match.Groups["docstring"].Value)
                    : "";

                string interfaceName = match.Groups["name"].Value;
                string modifiers = match.Groups["modifiers"].Success ? match.Groups["modifiers"].Value.Trim() : "";
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
                string extendsInterfaces = match.Groups["extends"].Success ? match.Groups["extends"].Value : "";

                // 查找接口的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string interfaceCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(extendsInterfaces))
                {
                    dependencies.AddRange(extendsInterfaces.Split(',').Select(i => i.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Interface",
                    Name = interfaceName,
                    Code = interfaceCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Namespace = packageName,
                    Documentation = docString,
                    Dependencies = dependencies,
                    Modifiers = modifiers,
                    Parameters = typeParams // 泛型参数
                });
            }

            // 匹配枚举定义
            var enumPattern =
                @"(?:\/\*\*(?<docstring>[\s\S]*?)\*\/\s*)?(?<modifiers>(?:public|private|protected|static|final|\s)+)?enum\s+(?<name>\w+)";
            var enumMatches = Regex.Matches(code, enumPattern);

            foreach (Match match in enumMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 提取JavaDoc注释
                string docString = match.Groups["docstring"].Success
                    ? CleanJavaDocComment(match.Groups["docstring"].Value)
                    : "";

                string enumName = match.Groups["name"].Value;
                string modifiers = match.Groups["modifiers"].Success ? match.Groups["modifiers"].Value.Trim() : "";

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
                    Namespace = packageName,
                    Documentation = docString,
                    Modifiers = modifiers
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
    /// 清理JavaDoc注释
    /// </summary>
    private static string CleanJavaDocComment(string comment)
    {
        return Regex.Replace(comment, @"^\s*\*\s*", "", RegexOptions.Multiline).Trim();
    }
}