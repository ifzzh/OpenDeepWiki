using System.Threading;
using System.Threading.Tasks;
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
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken());

    Task RunMigrateAsync();
}