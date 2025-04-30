namespace KoalaWiki.KoalaWarehouse;

public class DocumentContext
{
    private static readonly AsyncLocal<DocumentHolder> _documentHolder = new();

    public static DocumentStore? DocumentStore
    {
        get => _documentHolder.Value?.DocumentStore;
        set
        {
            _documentHolder.Value ??= new DocumentHolder();

            _documentHolder.Value.DocumentStore = value;
        }
    }


    private class DocumentHolder
    {
        public DocumentStore DocumentStore { get; set; } = new();
    }
}

public class DocumentStore
{
    public List<string> Files { get; set; } = new();
}