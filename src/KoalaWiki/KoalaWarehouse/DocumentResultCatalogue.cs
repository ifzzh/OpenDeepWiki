using System.ComponentModel;

namespace KoalaWiki.KoalaWarehouse;

public class DocumentResultCatalogue
{
    public List<DocumentResultCatalogueItem> items { get; set; } = new();
}

public class DocumentResultCatalogueItem
{
    [Description("A concise description that is suitable as a description for the document directory")]
    public string name { get; set; }
    
    [Description("Lowercase, hyphenated slugs for URL paths (e.g., \"api-reference\")")]
    public string title { get; set; }
    
    [Description("A short description of the document directory")]
    public string prompt {get; set;}
    
    public List<DocumentResultCatalogueChildItem> children { get; set; } = new();
}

public class DocumentResultCatalogueChildItem
{
    [Description("A concise description that is suitable as a description for the document directory")]
    public string name { get; set; }
    
    [Description("Lowercase, hyphenated slugs for URL paths (e.g., \"api-reference\")")]
    public string title { get; set; }
    
    [Description("A short description of the document directory")]
    public string prompt {get; set;}

    public List<DocumentResultCatalogueChildItem1> children { get; set; } = new();
}


public class DocumentResultCatalogueChildItem1
{
    [Description("A concise description that is suitable as a description for the document directory")]
    public string name { get; set; }
    
    [Description("Lowercase, hyphenated slugs for URL paths (e.g., \"api-reference\")")]
    public string title { get; set; }
    
    [Description("A short description of the document directory")]
    public string prompt {get; set;}

}