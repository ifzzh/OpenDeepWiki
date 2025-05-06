using KoalaWiki.Memory.Embedding;
using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory;

public class TextParagraph1536 : TextParagraph
{
    /// <summary>The embedding generated from the Text.</summary>
    [VectorStoreRecordVector(1536)]
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}