using System.ComponentModel;
using KoalaWiki.CodeMap;
using Microsoft.SemanticKernel;

namespace KoalaWiki.Functions;

public class RagFunction(string warehouseId)
{
    [KernelFunction, Description("可以帮助用户搜索当前代码仓库的代码或文档")]
    public async Task<string> SearchCodeAsync(
        [Description("更接近需要的代码或文档的描述，例如：搜索一个函数，或者搜索一个类")]
        string query, double minRelevance = 0.3)
    {
        var result = new List<string>();

        var enhancedCodeIndexer = new EnhancedCodeIndexer();

        var value = await enhancedCodeIndexer.SearchSimilarCodeAsync(query, warehouseId, 3, minRelevance);
        string prompt = string.Empty;
        foreach (var item in value)
        {
            prompt +=
                $"""
                 <code>
                 {item.Code}
                 </code>   
                  
                 <description>                
                 {item.Description}
                 </description>

                 代码引用:
                 <references>
                 {item.references}
                 </references>
                 """;
        }

        return prompt;
    }
}