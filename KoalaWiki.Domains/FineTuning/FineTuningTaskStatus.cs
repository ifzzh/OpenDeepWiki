namespace KoalaWiki.Domains.FineTuning;

public enum FineTuningTaskStatus
{
    /// <summary>
    /// 未开始
    /// </summary>
    NotStarted = 0,
    
    /// <summary>
    /// 进行中
    /// </summary>
    InProgress = 1,
    
    /// <summary>
    /// 已完成
    /// </summary>
    Completed = 2,
    
    /// <summary>
    /// 失败
    /// </summary>
    Failed = 3,
}