﻿namespace KoalaWiki.Dto;

public class CompletionsInput
{
    /// <summary>
    /// 关联id
    /// </summary>
    public string ChatShareMessageId { get; set; }
    
    public string Question { get; set; }

    public List<CompletionsMessageInput> Messages { get; set; } = [];
}

public class CompletionsMessageInput
{
    public string Role { get; set; }

    public string Content { get; set; }
}