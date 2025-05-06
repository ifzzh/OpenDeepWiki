using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory.Embedding;

public class TextParagraph2048 : TextParagraph
{
    /// <summary>The embedding generated from the Text.</summary>
    [VectorStoreRecordVector(2048)]
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}