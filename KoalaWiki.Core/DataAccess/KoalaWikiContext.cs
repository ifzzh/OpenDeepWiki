using System;
using System.Collections.Generic;
using System.Text.Json;
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

public class KoalaWikiContext<TContext>(DbContextOptions<TContext> options)
    : DbContext(options), IKoalaWikiContext where TContext : DbContext
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

    public DbSet<TrainingDataset> TrainingDatasets { get; set; }

    public DbSet<FineTuningTask> FineTuningTasks { get; set; }

    public DbSet<User> Users { get; set; }

    public DbSet<MCPHistory> MCPHistories { get; set; }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken())
    {
        BeforeSaveChanges();
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        BeforeSaveChanges();
        return base.SaveChanges();
    }

    private void BeforeSaveChanges()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry is { State: EntityState.Added, Entity: ICreateEntity creationAudited })
            {
                creationAudited.CreatedAt = DateTime.UtcNow;
            }
        }
    }

    public async Task RunMigrateAsync()
    {
        await Database.MigrateAsync();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Warehouse>((builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name).IsRequired();

            builder.Property(x => x.Description).IsRequired();

            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.Name);

            builder.HasIndex(x => x.Status);

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.Address);

            builder.HasIndex(x => x.Type);

            builder.HasIndex(x => x.Branch);

            builder.HasIndex(x => x.OrganizationName);
        }));

        modelBuilder.Entity<DocumentCatalog>((builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name).IsRequired();

            builder.Property(x => x.Description).IsRequired();

            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.Name);

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.ParentId);

            builder.HasIndex(x => x.WarehouseId);

            builder.HasIndex(x => x.DucumentId);

            builder.HasIndex(x => x.IsDeleted);

            builder.Property(x => x.DependentFile)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => string.IsNullOrEmpty(v)
                        ? new List<string>()
                        : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null));
        }));

        modelBuilder.Entity<Document>((builder =>
        {
            builder.HasKey(x => x.Id);


            builder.Property(x => x.Description).IsRequired();

            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.WarehouseId);
        }));

        modelBuilder.Entity<DocumentFileItem>((builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Title).IsRequired();

            builder.Property(x => x.Description).IsRequired();

            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.Title);

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.DocumentCatalogId);

            builder.Property(x => x.Metadata)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions)null));

            builder.Property(x => x.Extra)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions)null));
        }));

        modelBuilder.Entity<DocumentFileItemSource>((builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name).IsRequired();

            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.Name);

            builder.HasIndex(x => x.CreatedAt);

            builder.HasIndex(x => x.DocumentFileItemId);
        }));

        modelBuilder.Entity<DocumentOverview>(options =>
        {
            options.HasKey(x => x.Id);

            options.Property(x => x.Title).IsRequired();

            options.HasIndex(x => x.DocumentId);

            options.HasIndex(x => x.Title);
        });

        modelBuilder.Entity<DocumentCommitRecord>(options =>
        {
            options.HasKey(x => x.Id);

            options.Property(x => x.CommitMessage).IsRequired();

            options.Property(x => x.Author).IsRequired();

            options.HasIndex(x => x.WarehouseId);

            options.HasIndex(x => x.CommitId);
        });

        modelBuilder.Entity<ChatShareMessage>(options =>
        {
            options.HasKey(x => x.Id);

            options.HasIndex(x => x.WarehouseId);
        });

        modelBuilder.Entity<ChatShareMessageItem>(options =>
        {
            options.HasKey(x => x.Id);

            options.HasIndex(x => x.ChatShareMessageId);
            options.HasIndex(x => x.WarehouseId);

            options.Property(x => x.Question).IsRequired();

            options.HasIndex(x => x.Question);

            options.Property(x => x.Files)
                .HasConversion(x => JsonSerializer.Serialize(x, (JsonSerializerOptions)null),
                    x => JsonSerializer.Deserialize<List<string>>(x, (JsonSerializerOptions)null));
        });

        modelBuilder.Entity<User>(options =>
        {
            options.HasKey(x => x.Id);

            options.Property(x => x.Name).IsRequired();

            options.Property(x => x.Email).IsRequired();

            options.Property(x => x.Password).IsRequired();

            options.HasIndex(x => x.Name);

            options.HasIndex(x => x.Email);

            options.HasIndex(x => x.CreatedAt);

            options.HasIndex(x => x.LastLoginAt);
        });

        modelBuilder.Entity<TrainingDataset>(options =>
        {
            options.HasKey(x => x.Id);

            options.Property(x => x.Name).IsRequired();

            options.HasIndex(x => x.Name);

            options.HasIndex(x => x.CreatedAt);

            options.HasIndex(x => x.WarehouseId);
        });

        modelBuilder.Entity<FineTuningTask>(options =>
        {
            options.HasKey(x => x.Id);

            options.Property(x => x.Name).IsRequired();

            options.HasIndex(x => x.Name);

            options.HasIndex(x => x.CreatedAt);

            options.HasIndex(x => x.TrainingDatasetId);
            options.HasIndex(x => x.UserId);
            options.HasIndex(x => x.Status);
            options.HasIndex(x => x.WarehouseId);
            options.HasIndex(x => x.DocumentCatalogId);

            options.HasOne(x => x.DocumentCatalog)
                .WithMany()
                .HasForeignKey(x => x.DocumentCatalogId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MCPHistory>(options =>
        {
            options.HasComment("MCP历史记录");

            options.Property(x => x.Id).HasComment("主键Id");
            options.HasKey(x => x.Id);

            options.HasIndex(x => x.CreatedAt);

            options.HasIndex(x => x.WarehouseId);

            options.HasIndex(x => x.UserId);
        });
    }
}