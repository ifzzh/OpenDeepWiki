using System.ComponentModel;
using LibGit2Sharp;

namespace KoalaWiki.Git;

public class GitService
{
    private (string localPath, string organization) GetRepositoryPath(string repositoryUrl)
    {
        // 解析仓库地址
        var uri = new Uri(repositoryUrl);
        // 得到组织名和仓库名称
        var segments = uri.Segments;
        var organization = segments[1].Trim('/');
        var repositoryName = segments[2].Trim('/').Replace(".git", "");

        // 拼接本地路径
        var repositoryPath = Path.Combine("/repositories", organization, repositoryName);
        return (repositoryPath, organization);
    }

    /// <summary>
    /// 拉取指定仓库
    /// </summary>
    /// <returns></returns>
    public (string localPath, string name, string organizationName) PullRepository(
        [Description("仓库地址")] string repositoryUrl,
        [Description("分支")] string branch = "master")
    {
        var (localPath,organization) = GetRepositoryPath(repositoryUrl);

        // 配置克隆选项
        var cloneOptions = new CloneOptions
        {
            FetchOptions =
            {
                Depth = 1 // 浅克隆，仅获取最新提交
            }
        };

        var names = localPath.Split("/");
        
        var repositoryName = names[^1];

        // 判断仓库是否已经存在
        if (Directory.Exists(localPath))
        {
            return (localPath, repositoryName,organization);
        }

        var str = Repository.Clone(repositoryUrl, localPath, cloneOptions);

        // 返回仓库名称
        // 返回仓库描述

        return (localPath, repositoryName,organization);
    }
}