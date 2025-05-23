using System.Threading;
using System.Threading.Tasks;
using KoalaWiki.Domains;
using KoalaWiki.Domains.FineTuning;
using KoalaWiki.Domains.MCP;
using KoalaWiki.Domains.Users;
using KoalaWiki.Entities;
using KoalaWiki.Entities.DocumentFile;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.Core.DataAccess;

public interface IKoalaWikiContext
{
    public DbSet<Warehouse> Warehouses { get; set; }

    public DbSet<DocumentCatalog> DocumentCatalogs { get; set; }

    public DbSet<Document> Documents { get; set; }

    public DbSet<DocumentFileItem> DocumentFileItems { get; set; }

    public DbSet<DocumentFileItemSource> DocumentFileItemSources { get; set; }

    public DbSet<DocumentOverview> DocumentOverviews { get; set; }

    public DbSet<DocumentCommitRecord> DocumentCommitRecords { get; set; }

    public DbSet<ChatShareMessage> ChatShareMessages { get; set; }

    public DbSet<ChatShareMessageItem> ChatShareMessageItems { get; set; }
    
    /// <summary>
    /// 训练数据集
    /// </summary>
    public DbSet<TrainingDataset> TrainingDatasets { get; set; }
    
    public DbSet<FineTuningTask> FineTuningTasks { get; set; }
    
    public DbSet<User> Users { get; set; }
    
    public DbSet<MCPHistory> MCPHistories { get; set; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken());

    Task RunMigrateAsync();
}