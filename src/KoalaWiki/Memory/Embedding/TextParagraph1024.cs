using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory.Embedding;

public class TextParagraph1024 : TextParagraph
{
    /// <summary>The embedding generated from the Text.</summary>
    [VectorStoreRecordVector(1024)]
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}