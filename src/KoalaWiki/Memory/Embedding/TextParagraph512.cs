using Microsoft.Extensions.VectorData;

namespace KoalaWiki.Memory.Embedding;

public class TextParagraph512 : TextParagraph
{
    [VectorStoreRecordVector(512)]
    public ReadOnlyMemory<float> TextEmbedding { get; set; }
}