using System;
using System.ComponentModel.DataAnnotations;

namespace KoalaWiki.Domains;

/// <summary>
/// 应用配置实体
/// </summary>
public class AppConfig : Entity<string>
{
    /// <summary>
    /// 应用ID（唯一标识）
    /// </summary>
    [Required]
    [StringLength(64)]
    public string AppId { get; set; } = string.Empty;
    
    /// <summary>
    /// 应用名称
    /// </summary>
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 组织名称
    /// </summary>
    [Required]
    [StringLength(100)]
    public string OrganizationName { get; set; } = string.Empty;
    
    /// <summary>
    /// 仓库名称
    /// </summary>
    [Required]
    [StringLength(100)]
    public string RepositoryName { get; set; } = string.Empty;
    
    /// <summary>
    /// 允许的域名列表（JSON 格式存储）
    /// </summary>
    public string AllowedDomainsJson { get; set; } = "[]";
    
    /// <summary>
    /// 是否启用域名验证
    /// </summary>
    public bool EnableDomainValidation { get; set; } = false;
    
    /// <summary>
    /// 应用描述
    /// </summary>
    [StringLength(500)]
    public string Description { get; set; } = string.Empty;
    
    /// <summary>
    /// 创建用户ID
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; } = true;
    
    /// <summary>
    /// 最后使用时间
    /// </summary>
    public DateTime? LastUsedAt { get; set; }
} 