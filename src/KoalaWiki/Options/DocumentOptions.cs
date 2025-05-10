namespace KoalaWiki.Options;

public class DocumentOptions
{
    public const string Name = "Document";

    /// <summary>
    /// 排除的文件
    /// </summary>
    /// <returns></returns>
    public static string[] ExcludedFiles { get; set; } = [];
    
    /// <summary>
    /// 排除的文件夹
    /// </summary>
    /// <returns></returns>
    public static string[] ExcludedFolders { get; set; } = [];
    
    /// <summary>
    /// 是否启用智能过滤
    /// </summary>
    /// <returns></returns>
    public static bool EnableSmartFilter { get; set; } = true;
}