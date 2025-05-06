using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory.Embedding;

public class TextParagraph
{
    [VectorStoreRecordData(IsIndexed = true,IsFullTextIndexed = true)] public string Tag { get; set; }

    [VectorStoreRecordData(IsIndexed = true,IsFullTextIndexed = true)]  public string WarehouseId { get; init; }

    [VectorStoreRecordData(IsIndexed = true,IsFullTextIndexed = true)] public string DocumentCatalogId { get; init; }

    [VectorStoreRecordData(IsIndexed = true,IsFullTextIndexed = true)] public string DocumentFileItemId { get; init; }

    /// <summary>
    /// 一段文本的唯一键。
    /// </summary>
    [VectorStoreRecordKey]
    public string Key { get; init; }

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
    
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}