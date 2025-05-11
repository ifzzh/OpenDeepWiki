using KoalaWiki.Provider.PostgreSQL;
using KoalaWiki.Provider.Sqlite;

namespace KoalaWiki.Extensions;

public static class DbContextExtensions
{
    public static IServiceCollection AddDbContext(this IServiceCollection services,
        IConfiguration configuration)
    {
        var dbType = Environment.GetEnvironmentVariable("DB_TYPE").GetTrimmedValueOrEmpty();
        var dbConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING").GetTrimmedValueOrEmpty();

        if (string.IsNullOrEmpty(dbType) || string.IsNullOrEmpty(dbConnectionString))
        {
            if (configuration.GetConnectionString("type")?.Equals("postgres", StringComparison.OrdinalIgnoreCase) ==
                true)
            {
                AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
                AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);
                services.AddPostgreSQLDbContext(configuration);
            }
            else
            {
                services.AddSqliteDbContext(configuration);
            }

            return services;
        }

        if (dbType.Equals("postgres", StringComparison.OrdinalIgnoreCase))
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);
            services.AddPostgreSQLDbContext(dbConnectionString);
        }
        else
        {
            services.AddSqliteDbContext(dbConnectionString);
        }

        return services;
    }
}