using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains.Users;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.DataMigration;

public class DataMigrationTask(IServiceProvider service) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(100, stoppingToken);

        await using var scope = service.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetService<IKoalaWikiContext>();

        // 判断是否存在账号
        if (await dbContext!.Users.AnyAsync(stoppingToken))
        {
            // 如果存在账号，则不执行迁移
            return;
        }

        // 迁移数据库
        var admin = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "admin",
            Password = "admin",
            Email = "239573049@qq.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Avatar = "https://avatars.githubusercontent.com/u/61819790?v=4",
            Role = "admin",
        };

        // 创建管理员账号
        await dbContext.Users.AddAsync(admin, stoppingToken);
        await dbContext.SaveChangesAsync(stoppingToken);
        
        
    }
}