using System.Text.Json;
using FastService;
using KoalaWiki.Dto;
using KoalaWiki.Infrastructure;
using Microsoft.Extensions.Caching.Memory;

namespace KoalaWiki.Services;

[Filter(typeof(ResultFilter))]
[Tags("Git")]
public class GitRepositoryService(
    IHttpClientFactory httpClientFactory,
    ILogger<GitRepositoryService> logger,
    IMemoryCache memoryCache)
    : FastApi
{
    public async Task<RepoExtendedInfo> GetRepoInfoAsync(string repoUrl)
    {
        string cacheKey = $"repo_info:{repoUrl}";
        if (memoryCache.TryGetValue(cacheKey, out RepoExtendedInfo? cached) && cached != null)
        {
            return cached;
        }

        var httpClient = httpClientFactory.CreateClient("KoalaWiki");

        string owner = string.Empty;
        string repo = string.Empty;
        string platform = string.Empty;

        try
        {
            if (repoUrl.Contains("github.com"))
            {
                platform = "github";
                var parts = repoUrl.Replace("https://github.com/", "").Split('/');
                owner = parts[0];
                repo = parts[1]?.Split('/')[0].Replace(".git", "");
            }
            else if (repoUrl.Contains("gitee.com"))
            {
                platform = "gitee";
                var parts = repoUrl.Replace("https://gitee.com/", "").Split('/');
                owner = parts[0];
                repo = parts[1]?.Split('/')[0].Replace(".git", "");
            }
            else
            {
                try
                {
                    var url = new Uri(repoUrl);
                    var segments = url.AbsolutePath.Trim('/').Split('/');
                    owner = segments.Length > 0 ? segments[0] : string.Empty;
                    repo = segments.Length > 1 ? segments[1].Replace(".git", "") : string.Empty;
                    if (url.Host.Contains("github"))
                        platform = "github";
                    else if (url.Host.Contains("gitee"))
                        platform = "gitee";
                    else
                        platform = "unknown";
                }
                catch
                {
                    var result = new RepoExtendedInfo
                    {
                        Success = false,
                        Stars = 0,
                        Forks = 0,
                        AvatarUrl = string.Empty,
                        OwnerUrl = string.Empty,
                        RepoUrl = repoUrl,
                        Error = "无效的仓库地址"
                    };
                    memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                    return result;
                }
            }

            if (string.IsNullOrEmpty(owner) || string.IsNullOrEmpty(repo))
            {
                var result = new RepoExtendedInfo
                {
                    Success = false,
                    Stars = 0,
                    Forks = 0,
                    AvatarUrl = string.Empty,
                    OwnerUrl = string.Empty,
                    RepoUrl = repoUrl,
                    Error = "无法解析仓库所有者或名称"
                };
                memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                return result;
            }

            if (platform == "github")
            {
                var apiUrl = $"https://api.github.com/repos/{owner}/{repo}";
                var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
                request.Headers.Add("User-Agent", "KoalaWiki-Agent");

                var response = await httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadFromJsonAsync<RepoGitHubRepoDto>();
                    var result = new RepoExtendedInfo
                    {
                        Success = true,
                        Stars = json.stargazers_count,
                        Forks = json.forks_count,
                        AvatarUrl = json.owner.avatar_url ??
                                    $"https://github.com/{owner}.png",
                        OwnerUrl = json.owner.html_url ??
                                   $"https://github.com/{owner}",
                        RepoUrl = json.html_url ?? repoUrl,
                        Language = json.language,
                        License = json.license.name,
                        Description = json.description
                    };
                    memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                    return result;
                }
                else
                {
                    var result = new RepoExtendedInfo
                    {
                        Success = false,
                        Stars = 0,
                        Forks = 0,
                        AvatarUrl = $"https://github.com/{owner}.png",
                        OwnerUrl = $"https://github.com/{owner}",
                        RepoUrl = repoUrl,
                        Error = $"GitHub API 请求失败: {response.StatusCode}"
                    };
                    memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                    return result;
                }
            }
            else if (platform == "gitee")
            {
                var apiUrl = $"https://gitee.com/api/v5/repos/{owner}/{repo}";
                var response = await httpClient.GetAsync(apiUrl);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadFromJsonAsync<RepoGiteeRepoDto>();
                    var result = new RepoExtendedInfo
                    {
                        Success = true,
                        Stars = json.stargazers_count,
                        Forks = json.forks_count,
                        AvatarUrl = json.owner.avatar_url ??
                                    $"https://gitee.com/{owner}.png",
                        OwnerUrl = json.owner.html_url ??
                                   $"https://gitee.com/{owner}",
                        RepoUrl = json.html_url ?? repoUrl,
                        Language = json.language,
                        License = json.license,
                        Description = json.description
                    };
                    memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                    return result;
                }
                else
                {
                    var result = new RepoExtendedInfo
                    {
                        Success = false,
                        Stars = 0,
                        Forks = 0,
                        AvatarUrl = $"https://gitee.com/{owner}.png",
                        OwnerUrl = $"https://gitee.com/{owner}",
                        RepoUrl = repoUrl,
                        Error = $"Gitee API 请求失败: {response.StatusCode}"
                    };
                    memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                    return result;
                }
            }
            else
            {
                var result = new RepoExtendedInfo
                {
                    Success = false,
                    Stars = 0,
                    Forks = 0,
                    AvatarUrl = string.Empty,
                    OwnerUrl = string.Empty,
                    RepoUrl = repoUrl,
                    Error = "不支持的代码托管平台"
                };
                memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
                return result;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "获取仓库信息失败");
            var result = new RepoExtendedInfo
            {
                Success = false,
                Stars = 0,
                Forks = 0,
                AvatarUrl = string.Empty,
                OwnerUrl = string.Empty,
                RepoUrl = repoUrl,
                Error = $"获取仓库信息失败: {ex.Message}"
            };
            memoryCache.Set(cacheKey, result, TimeSpan.FromHours(5));
            return result;
        }
    }
}