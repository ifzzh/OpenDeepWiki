﻿namespace KoalaWiki.Dto;

public class WarehouseInput
{
    /// <summary>
    /// 仓库地址
    /// </summary>
    /// <returns></returns>
    public string Address { get; set; }

    /// <summary>
    /// 私有化git账号
    /// </summary>
    public string? GitUserName { get; set; }

    /// <summary>
    /// 私有化git密码
    /// </summary>
    public string? GitPassword { get; set; }
    
    /// <summary>
    ///  私有化git邮箱
    /// </summary>
    public string? Email { get; set; }
}