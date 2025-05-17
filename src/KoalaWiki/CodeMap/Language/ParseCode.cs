namespace KoalaWiki.CodeMap.Language;

public class ParseCode
{
    /// <summary>
    /// 提取代码段
    /// </summary>
    public static string ExtractCodeSegment(string code, int startPos, int endLine)
    {
        var lines = code.Split('\n');
        int startLine = ParseCode.GetLineNumber(code, startPos);

        return string.Join('\n', lines.Skip(startLine - 1).Take(endLine - startLine + 1));
    }

    /// <summary>
    /// 查找闭合花括号的字符位置
    /// </summary>
    public static int FindClosingBracePosition(string code, int openBracePos)
    {
        int count = 1;
        for (int i = openBracePos + 1; i < code.Length; i++)
        {
            if (code[i] == '{')
                count++;
            else if (code[i] == '}')
            {
                count--;
                if (count == 0)
                    return i;
            }
        }

        return -1;
    }
    
    /// <summary>
    /// 查找匹配的闭合花括号位置
    /// </summary>
    public static int FindClosingBrace(string code, int startPos)
    {
        int openBracePos = code.IndexOf('{', startPos);
        if (openBracePos == -1)
            return ParseCode.GetLineNumber(code, startPos) + 1;

        int endPos = FindClosingBracePosition(code, openBracePos);
        return endPos != -1 ? ParseCode.GetLineNumber(code, endPos) : ParseCode.GetLineNumber(code, code.Length - 1);
    }

    /// <summary>
    /// 获取指定位置的行号
    /// </summary>
    public static int GetLineNumber(string text, int position)
    {
        int lineNumber = 1;
        for (int i = 0; i < position && i < text.Length; i++)
        {
            if (text[i] == '\n')
                lineNumber++;
        }

        return lineNumber;
    }

    /// <summary>
    /// 通用代码解析（按行数分割）
    /// </summary>
    public static List<CodeSegment> ParseGenericCode(string code)
    {
        return SplitByLines(code, 50);
    }

    /// <summary>
    /// 按固定行数分割代码
    /// </summary>
    public static List<CodeSegment> SplitByLines(string code, int linesPerSegment)
    {
        var segments = new List<CodeSegment>();
        var lines = code.Split('\n');

        for (int i = 0; i < lines.Length; i += linesPerSegment)
        {
            int startLine = i + 1;
            int endLine = Math.Min(i + linesPerSegment, lines.Length);

            string segmentCode = string.Join('\n', lines.Skip(i).Take(linesPerSegment));

            segments.Add(new CodeSegment
            {
                Type = $"Code segment",
                Code = segmentCode,
                StartLine = startLine,
                EndLine = endLine
            });
        }

        return segments;
    }
}