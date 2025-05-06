using KoalaWiki.Memory.Embedding;
using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory;

public class TextParagraph768 : TextParagraph
{
    [VectorStoreRecordData] public string Tag { get; set; }

    [VectorStoreRecordData] public string WarehouseId { get; init; }

    [VectorStoreRecordData] public string DocumentCatalogId { get; init; }

    [VectorStoreRecordData] public string DocumentFileItemId { get; init; }

    /// <summary>
    /// 一段文本的唯一键。
    /// </summary>
    [VectorStoreRecordKey]
    public Guid Key { get; init; }
    

    /// <summary>
    /// 具体文件名称
    /// </summary>
    public string FileName { get; init; }
    
    /// <summary>
    /// 当前段落在文档中的索引位置。
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// 段落文本内容
    /// </summary>
    [VectorStoreRecordData]
    public string Text { get; init; }

    /// <summary>The embedding generated from the Text.</summary>
    [VectorStoreRecordVector(768)]
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}