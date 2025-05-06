namespace KoalaWiki.Dto;

public class CompletionsInput
{
    public string Owner { get; set; }

    public string Name { get; set; }

    public string Question { get; set; }

    public List<CompletionsMessageInput> Messages { get; set; } = new List<CompletionsMessageInput>();
}

public class CompletionsMessageInput
{
    public string Role { get; set; }

    public string Content { get; set; }
}