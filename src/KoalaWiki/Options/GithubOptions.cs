namespace KoalaWiki.Options;

public class GithubOptions
{
    public static string ClientId { get; set; }

    public static string ClientSecret { get; set; }

    public static string Token { get; set; }


    public static void InitConfig(IConfiguration configuration)
    {
        ClientId = configuration["Github:ClientId"] ?? configuration["GITHUB_CLIENT_ID"];
        ClientSecret = configuration["Github:ClientSecret"] ?? configuration["GITHUB_CLIENT_SECRET"];
        Token = configuration["Github:Token"] ?? configuration["GITHUB_TOKEN"];
    }
}