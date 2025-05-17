using System.Text.RegularExpressions;

namespace KoalaWiki.CodeMap.Language;

public class ParseGo
{
    /// <summary>
    /// 解析Go代码
    /// </summary>
    public static List<CodeSegment> ParseGoCode(string code)
    {
        var segments = new List<CodeSegment>();

        try
        {
            // 匹配包声明
            var packagePattern = @"package\s+(?<name>\w+)";
            var packageMatch = Regex.Match(code, packagePattern);
            string packageName = packageMatch.Success ? packageMatch.Groups["name"].Value : "";

            // 匹配导入语句
            var importPattern = @"import\s+\((?<imports>[\s\S]*?)\)";
            var importMatches = Regex.Matches(code, importPattern);
            var imports = new List<string>();
            foreach (Match match in importMatches)
            {
                string importBlock = match.Groups["imports"].Value;
                var importLines = importBlock.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in importLines)
                {
                    string trimmed = line.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        imports.Add(trimmed.Trim('"'));
                    }
                }
            }

            // 匹配单行导入
            var singleImportPattern = @"import\s+""(?<name>[\w\.\/]+)""";
            var singleImportMatches = Regex.Matches(code, singleImportPattern);
            foreach (Match match in singleImportMatches)
            {
                imports.Add(match.Groups["name"].Value);
            }

            // 匹配结构体定义
            var structPattern = @"(?:\/\/\s*(?<comment>.*?)\n)?type\s+(?<name>\w+)\s+struct\s*{";
            var structMatches = Regex.Matches(code, structPattern);

            foreach (Match match in structMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string comment = match.Groups["comment"].Success ? match.Groups["comment"].Value : "";
                string structName = match.Groups["name"].Value;

                // 查找结构体的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string structCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Struct",
                    Name = structName,
                    Code = structCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Namespace = packageName,
                    Documentation = comment
                });
            }

            // 匹配接口定义
            var interfacePattern = @"(?:\/\/\s*(?<comment>.*?)\n)?type\s+(?<name>\w+)\s+interface\s*{";
            var interfaceMatches = Regex.Matches(code, interfacePattern);

            foreach (Match match in interfaceMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string comment = match.Groups["comment"].Success ? match.Groups["comment"].Value : "";
                string interfaceName = match.Groups["name"].Value;

                // 查找接口的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string interfaceCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

                segments.Add(new CodeSegment
                {
                    Type = "Interface",
                    Name = interfaceName,
                    Code = interfaceCode,
                    StartLine = startLine,
                    EndLine = endLine,
                    Namespace = packageName,
                    Documentation = comment
                });
            }

            // 匹配函数定义
            var functionPattern =
                @"(?:\/\/\s*(?<comment>.*?)\n)?func\s+(?:\((?<receiver>\w+\s+[\*\w]+)\)\s+)?(?<name>\w+)\s*\((?<params>.*?)\)(?:\s*\((?<returns>.*?)\)|\s+(?<returnType>[\w\*\[\]]+))?";
            var functionMatches = Regex.Matches(code, functionPattern);

            foreach (Match match in functionMatches)
            {
                int startPos = match.Index;
                int startLine = ParseCode.GetLineNumber(code, startPos);

                string comment = match.Groups["comment"].Success ? match.Groups["comment"].Value : "";
                string functionName = match.Groups["name"].Value;
                string receiver = match.Groups["receiver"].Success ? match.Groups["receiver"].Value : "";
                string parameters = match.Groups["params"].Value;
                string returns = match.Groups["returns"].Success
                    ? match.Groups["returns"].Value
                    : (match.Groups["returnType"].Success ? match.Groups["returnType"].Value : "");

                // 判断是否为方法（有接收器）
                bool isMethod = !string.IsNullOrEmpty(receiver);
                string receiverType = "";
                if (isMethod)
                {
                    // 提取接收器类型
                    var receiverParts = receiver.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (receiverParts.Length >= 2)
                    {
                        receiverType = receiverParts[1].TrimStart('*');
                    }
                }

                // 查找函数的结束位置
                int endLine = ParseCode.FindClosingBrace(code, startPos);
                string functionCode = ParseCode.ExtractCodeSegment(code, startPos, endLine);

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
                    Namespace = packageName,
                    ClassName = receiverType, // 如果是方法，这是接收器类型
                    Documentation = comment,
                    Parameters = parameters,
                    ReturnType = returns,
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

}