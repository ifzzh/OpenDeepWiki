namespace KoalaWiki.Dto;

public class ResponsesInput
{
    public List<ResponsesMessageInput> Messages { get; set; } = new();
    
    /// <summary>
    /// 组织名
    /// </summary>
    /// <returns></returns>
    public string OrganizationName { get; set; } = string.Empty;
    
    /// <summary>
    /// 仓库名称
    /// </summary>
    public string Name { get; set; } = string.Empty;
}

public class ResponsesMessageInput
{
    /// <summary>
    /// 消息角色：user, assistant, system
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// 文本内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Base64编码的图片内容
    /// </summary>
    public List<Base64Content>? ImageContents { get; set; }
}

public class Base64Content
{
    /// <summary>
    /// Base64编码的内容
    /// </summary>
    public string Data { get; set; } = string.Empty;
    
    /// <summary>
    /// 内容类型，如 image/png, image/jpeg 等
    /// </summary>
    public string MimeType { get; set; } = string.Empty;
}