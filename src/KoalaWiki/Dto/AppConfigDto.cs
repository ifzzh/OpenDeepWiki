namespace KoalaWiki.Dto;

/// <summary>
/// 应用配置输入
/// </summary>
public class AppConfigInput
{
    /// <summary>
    /// 应用ID
    /// </summary>
    public string AppId { get; set; } = string.Empty;
    
    /// <summary>
    /// 应用名称
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 组织名称
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;
    
    /// <summary>
    /// 仓库名称
    /// </summary>
    public string RepositoryName { get; set; } = string.Empty;
    
    /// <summary>
    /// 允许的域名列表
    /// </summary>
    public List<string> AllowedDomains { get; set; } = new();
    
    /// <summary>
    /// 是否启用域名验证
    /// </summary>
    public bool EnableDomainValidation { get; set; } = false;
    
    /// <summary>
    /// 应用描述
    /// </summary>
    public string Description { get; set; } = string.Empty;
}

/// <summary>
/// 应用配置输出
/// </summary>
public class AppConfigOutput
{
    /// <summary>
    /// 应用ID
    /// </summary>
    public string AppId { get; set; } = string.Empty;
    
    /// <summary>
    /// 应用名称
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; } = true;
    
    /// <summary>
    /// 组织名称
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;
    
    /// <summary>
    /// 仓库名称
    /// </summary>
    public string RepositoryName { get; set; } = string.Empty;
    
    /// <summary>
    /// 允许的域名列表
    /// </summary>
    public List<string> AllowedDomains { get; set; } = new();
    
    /// <summary>
    /// 是否启用域名验证
    /// </summary>
    public bool EnableDomainValidation { get; set; } = false;
    
    /// <summary>
    /// 应用描述
    /// </summary>
    public string Description { get; set; } = string.Empty;
    
    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 域名验证请求
/// </summary>
public class DomainValidationRequest
{
    /// <summary>
    /// 应用ID
    /// </summary>
    public string AppId { get; set; } = string.Empty;
    
    /// <summary>
    /// 域名
    /// </summary>
    public string Domain { get; set; } = string.Empty;
}

/// <summary>
/// 域名验证结果
/// </summary>
public class DomainValidationResponse
{
    /// <summary>
    /// 是否验证成功
    /// </summary>
    public bool IsValid { get; set; }
    
    /// <summary>
    /// 验证失败原因
    /// </summary>
    public string? Reason { get; set; }
    
    /// <summary>
    /// 应用配置（验证成功时返回）
    /// </summary>
    public AppConfigOutput? AppConfig { get; set; }
} 