using System.Text.RegularExpressions;

namespace KoalaWiki.CodeMap.Language;

public class ParseRust
{
    /// <summary>
    /// 解析Rust代码
    /// </summary>
    public static List<CodeSegment> ParseRustCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 匹配模块声明
            var modulePattern = @"mod\s+(?<name>\w+)(?:\s*{)?";
            var moduleMatches = Regex.Matches(code, modulePattern);

            foreach (Match match in moduleMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string moduleName = match.Groups["name"].Value;

                // 检查是否是内联模块或声明
                bool isInlineModule = code.Substring(startPos + match.Length - 1, 1) == "{";

                if (isInlineModule)
                {
                    // 查找模块的结束位置
                    int endLine = ParseCode.FindClosingBrace(code, startPos);
                    string moduleCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                    segments.Add(new CodeSegment
                    {
                        Type = "Module",
                        Name = moduleName,
                        Code = moduleCode,
                        StartLine = startLine,
                        EndLine = endLine
                    });
                }
                else
                {
                    // 这是一个模块声明，不是内联模块
                    segments.Add(new CodeSegment
                    {
                        Type = "Module Declaration",
                        Name = moduleName,
                        Code = match.Value,
                        StartLine = startLine,
                        EndLine = startLine
                    });
                }
            }

            // 匹配结构体定义
            var structPattern =
                @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?(?<vis>pub(?:\(.*?\))?\s+)?struct\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>:]+)>)?(?:\s*{|\s*\(|\s*;)";
            var structMatches = Regex.Matches(code, structPattern);

            foreach (Match match in structMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
                string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
                string visibility = match.Groups["vis"].Success ? match.Groups["vis"].Value.Trim() : "";
                string structName = match.Groups["name"].Value;
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";

                // 检查是否是元组结构体、单元结构体或常规结构体
                char structType = ' ';
                if (startPos + match.Length < code.Length)
                {
                    structType = code[startPos + match.Length - 1];
                }

                int endLine;
                if (structType == '{')
                {
                    // 常规结构体
                    endLine = ParseCode.FindClosingBrace(code, startPos);
                }
                else if (structType == '(')
                {
                    // 元组结构体
                    endLine = FindClosingParenthesis(code, startPos + match.Length - 1);
                }
                else
                {
                    // 单元结构体
                    endLine = startLine;
                }

                string structCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Struct",
                    Name = structName,
                    Code = structCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docComment,
                    Modifiers = visibility,
                    Parameters = typeParams // 泛型参数
                });
            }

            // 匹配枚举定义
            var enumPattern =
                @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?(?<vis>pub(?:\(.*?\))?\s+)?enum\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>:]+)>)?\s*{";
            var enumMatches = Regex.Matches(code, enumPattern);

            foreach (Match match in enumMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
                string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
                string visibility = match.Groups["vis"].Success ? match.Groups["vis"].Value.Trim() : "";
                string enumName = match.Groups["name"].Value;
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";

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
                    Documentation = docComment,
                    Modifiers = visibility,
                    Parameters = typeParams // 泛型参数
                });
            }

            // 匹配特性定义
            var traitPattern =
                @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?(?<vis>pub(?:\(.*?\))?\s+)?trait\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>:]+)>)?(?:\s*:\s*(?<supertraits>[\w\s,<>:+]+))?\s*{";
            var traitMatches = Regex.Matches(code, traitPattern);

            foreach (Match match in traitMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
                string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
                string visibility = match.Groups["vis"].Success ? match.Groups["vis"].Value.Trim() : "";
                string traitName = match.Groups["name"].Value;
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
                string supertraits = match.Groups["supertraits"].Success ? match.Groups["supertraits"].Value : "";

                // 查找特性的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string traitCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(supertraits))
                {
                    dependencies.AddRange(supertraits.Split(',').Select(t => t.Trim()));
                }

                segments.Add(new CodeSegment
                {
                    Type = "Trait",
                    Name = traitName,
                    Code = traitCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docComment,
                    Modifiers = visibility,
                    Parameters = typeParams, // 泛型参数
                    Dependencies = dependencies
                });
            }

            // 匹配实现块
            var implPattern =
                @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?impl(?:<(?<typeParams>[\w\s,<>:]+)>)?\s+(?<trait>[\w<>:]+\s+for\s+)?(?<type>[\w<>:]+)\s*{";
            var implMatches = Regex.Matches(code, implPattern);

            foreach (Match match in implMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
                string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
                string trait = match.Groups["trait"].Success ? match.Groups["trait"].Value.Trim() : "";
                string type = match.Groups["type"].Value;

                // 查找实现块的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string implCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                var dependencies = new List<string>();
                if (!string.IsNullOrEmpty(trait))
                {
                    string traitName = trait.Split(' ')[0].Trim();
                    dependencies.Add(traitName);
                }

                segments.Add(new CodeSegment
                {
                    Type = string.IsNullOrEmpty(trait) ? "Implementation Block" : "Trait Implementation",
                    Name = type + (string.IsNullOrEmpty(trait) ? "" : " for " + trait.Split(' ')[0].Trim()),
                    Code = implCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docComment,
                    Parameters = typeParams, // 泛型参数
                    Dependencies = dependencies,
                    ClassName = type // 实现类型
                });

                // 匹配实现块中的函数
                ParseRustImplFunctions(code, startPos, endLine, type, segments);
            }

            // 匹配独立函数
            var functionPattern =
                @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?(?<vis>pub(?:\(.*?\))?\s+)?fn\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>:]+)>)?\s*\((?<params>.*?)\)(?:\s*->\s*(?<returnType>[\w<>\[\]:,\s&']+))?";
            var functionMatches = Regex.Matches(code, functionPattern);

            foreach (Match match in functionMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                // 检查这个函数是否已经被处理过（作为实现块中的方法）
                bool alreadyProcessed = false;
                foreach (var segment in segments.Where(s => s.Type == "Method" || s.Type == "Function"))
                {
                    if (segment.StartLine == startLine)
                    {
                        alreadyProcessed = true;
                        break;
                    }
                }

                if (alreadyProcessed)
                    continue;

                string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
                string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
                string visibility = match.Groups["vis"].Success ? match.Groups["vis"].Value.Trim() : "";
                string functionName = match.Groups["name"].Value;
                string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
                string parameters = match.Groups["params"].Value;
                string returnType = match.Groups["returnType"].Success ? match.Groups["returnType"].Value : "";

                // 查找函数体的开始位置
                int bodyStartPos = code.IndexOf('{', startPos + match.Length);
                if (bodyStartPos == -1)
                    continue; // 可能是函数声明，没有函数体

                // 查找函数的结束位置
                int endLine = ParseCode.FindClosingBrace(code, bodyStartPos);
                string functionCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Function",
                    Name = functionName,
                    Code = functionCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Documentation = docComment,
                    Modifiers = visibility,
                    Parameters = parameters,
                    ReturnType = returnType
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
    /// 解析Rust实现块中的函数
    /// </summary>
    private static void ParseRustImplFunctions(string code, int implStartPos, int implEndLine, string implType,
        List<CodeSegment> segments)
    {
        // 提取实现块的代码
        string implCode = ParseCode.ExtractCodeSegment(code, implStartPos, implEndLine);

        // 匹配实现块中的函数
        var functionPattern =
            @"(?:\/\/\/\s*(?<doccomment>.*?)\n)?(?<attrs>(?:#\[.*?\]\s*)*)?(?<vis>pub(?:\(.*?\))?\s+)?fn\s+(?<name>\w+)(?:<(?<typeParams>[\w\s,<>:]+)>)?\s*\((?<params>.*?)\)(?:\s*->\s*(?<returnType>[\w<>\[\]:,\s&']+))?";
        var functionMatches = Regex.Matches(implCode, functionPattern);

        foreach (Match match in functionMatches)
        {
            int relativeStartPos = match.Index;
            int absoluteStartPos = implStartPos + relativeStartPos;
            int startLine = ParseCode.GetLineNumber(code, absoluteStartPos);

            string docComment = match.Groups["doccomment"].Success ? match.Groups["doccomment"].Value : "";
            string attributes = match.Groups["attrs"].Success ? match.Groups["attrs"].Value : "";
            string visibility = match.Groups["vis"].Success ? match.Groups["vis"].Value.Trim() : "";
            string functionName = match.Groups["name"].Value;
            string typeParams = match.Groups["typeParams"].Success ? match.Groups["typeParams"].Value : "";
            string parameters = match.Groups["params"].Value;
            string returnType = match.Groups["returnType"].Success ? match.Groups["returnType"].Value : "";

            // 检查是否是方法（第一个参数是self）
            bool isMethod = parameters.TrimStart().StartsWith("self") ||
                            parameters.TrimStart().StartsWith("&self") ||
                            parameters.TrimStart().StartsWith("&mut self") ||
                            parameters.TrimStart().StartsWith("mut self");

            // 查找函数体的开始位置
            int bodyStartPos = implCode.IndexOf('{', relativeStartPos + match.Length);
            if (bodyStartPos == -1)
                continue; // 可能是函数声明，没有函数体

            // 查找函数的结束位置
            int relativeEndPos = ParseCode.FindClosingBracePosition(implCode, bodyStartPos);
            if (relativeEndPos == -1)
                continue;

            int absoluteEndPos = implStartPos + relativeEndPos;
            int endLine = ParseCode.GetLineNumber(code, absoluteEndPos);

            string functionCode = ParseCode.ExtractCodeSegment(code, absoluteStartPos, endLine);

            segments.Add(new CodeSegment
            {
                Type = isMethod ? "Method" : "Associated Function",
                Name = functionName,
                Code = functionCode,
                StartLine = startLine,
                EndLine = endLine,
                ClassName = implType,
                Documentation = docComment,
                Modifiers = visibility,
                Parameters = parameters,
                ReturnType = returnType
            });
        }
    }

    /// <summary>
    /// 查找匹配的闭合括号位置
    /// </summary>
    private static int FindClosingParenthesis(string code, int startPos)
    {
        int count = 1;
        for (int i = startPos + 1; i < code.Length; i++)
        {
            if (code[i] == '(')
                count++;
            else if (code[i] == ')')
            {
                count--;
                if (count == 0)
                    return ParseCode.GetLineNumber(code, i);
            }
        }

        return ParseCode.GetLineNumber(code, code.Length - 1);
    }
}