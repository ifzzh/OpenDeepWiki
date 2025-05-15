using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains;
using KoalaWiki.Entities;
using LibGit2Sharp;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.Services;

public class DocumentCatalogService(IKoalaWikiContext dbAccess) : FastApi
{
    /// <summary>
    /// 获取目录列表
    /// </summary>
    /// <param name="organizationName"></param>
    /// <param name="name"></param>
    /// <returns></returns>
    /// <exception cref="NotFoundException"></exception>
    public async Task<object> GetDocumentCatalogsAsync(string organizationName, string name)
    {
        var warehouse = await dbAccess.Warehouses
            .AsNoTracking()
            .Where(x => x.Name == name && x.OrganizationName == organizationName)
            .FirstOrDefaultAsync();

        // 如果没有找到仓库，返回空列表
        if (warehouse == null)
        {
            throw new NotFoundException($"仓库不存在，请检查仓库名称和组织名称:{organizationName} {name}");
        }

        var document = await dbAccess.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouse.Id)
            .FirstOrDefaultAsync();

        var documentCatalogs = await dbAccess.DocumentCatalogs
            .Where(x => x.WarehouseId == warehouse.Id && x.IsDeleted == false)
            .ToListAsync();

        string lastUpdate;

        // 如果最近更新时间是今天那么只需要显示小时
        if (document?.LastUpdate != null)
        {
            var time = DateTime.Now - document.LastUpdate;
            lastUpdate = time.Days == 0 ? $"{time.Hours}小时前" : $"{time.Days}天前";

            if (time.Days > 7)
            {
                lastUpdate = document.LastUpdate.ToString("yyyy-MM-dd");
            }
        }
        else
        {
            lastUpdate = "刚刚";
        }

        return new
        {
            items = BuildDocumentTree(documentCatalogs),
            lastUpdate,
            document?.Description,
            progress = documentCatalogs.Count(x => x.IsCompleted) * 100 / documentCatalogs.Count,
            git = warehouse.Address,
            document?.WarehouseId,
            document?.LikeCount,
            document?.Status,
            document?.CommentCount,
        };
    }

    /// <summary>
    /// 根据目录id获取文件
    /// </summary>
    /// <returns></returns>
    public async Task GetDocumentByIdAsync(HttpContext httpContext, string owner, string name, string path)
    {
        // 先根据仓库名称和组织名称找到仓库
        var query = await dbAccess.Warehouses
            .AsNoTracking()
            .Where(x => x.Name == name && x.OrganizationName == owner)
            .FirstOrDefaultAsync();

        if (query == null)
        {
            throw new NotFoundException($"仓库不存在，请检查仓库名称和组织名称:{owner} {name}");
        }

        // 找到catalog
        var id = await dbAccess.DocumentCatalogs
            .AsNoTracking()
            .Where(x => x.WarehouseId == query.Id && x.Url == path && x.IsDeleted == false)
            .Select(x => x.Id)
            .FirstOrDefaultAsync();

        var item = await dbAccess.DocumentFileItems
            .AsNoTracking()
            .Where(x => x.DocumentCatalogId == id)
            .FirstOrDefaultAsync();

        if (item == null)
        {
            throw new NotFoundException("文件不存在");
        }

        // 找到所有引用文件
        var fileSource = await dbAccess.DocumentFileItemSources.Where(x => x.DocumentFileItemId == item.Id)
            .ToListAsync();

        //md
        await httpContext.Response.WriteAsJsonAsync(new
        {
            content = item.Content,
            title = item.Title,
            fileSource,
            address = query?.Address.Replace(".git", string.Empty),
            query?.Branch,
        });
    }


    /// <summary>
    /// 递归构建文档目录树形结构
    /// </summary>
    /// <param name="documents">所有文档目录列表</param>
    /// <returns>树形结构文档目录</returns>
    private List<object> BuildDocumentTree(List<DocumentCatalog> documents)
    {
        var result = new List<object>();

        // 获取顶级目录
        var topLevel = documents.Where(x => x.ParentId == null).OrderBy(x => x.Order).ToList();

        foreach (var item in topLevel)
        {
            var children = GetChildren(item.Id, documents);
            if (children == null || children.Count == 0)
            {
                result.Add(new
                {
                    label = item.Name,
                    Url = item.Url,
                    item.Description,
                    key = item.Id,
                    lastUpdate = item.CreatedAt,
                    // 是否启用
                    disabled = item.IsCompleted == false
                });
            }
            else
            {
                result.Add(new
                {
                    label = item.Name,
                    item.Description,
                    Url = item.Url,
                    key = item.Id,
                    lastUpdate = item.CreatedAt,
                    children,
                    // 是否启用
                    disabled = item.IsCompleted == false
                });
            }
        }

        return result;
    }

    /// <summary>
    /// 递归获取子目录
    /// </summary>
    /// <param name="parentId">父目录ID</param>
    /// <param name="documents">所有文档目录列表</param>
    /// <returns>子目录列表</returns>
    private List<object> GetChildren(string parentId, List<DocumentCatalog> documents)
    {
        var children = new List<object>();
        var directChildren = documents.Where(x => x.ParentId == parentId).OrderBy(x => x.Order).ToList();

        foreach (var child in directChildren)
        {
            // 递归获取子目录的子目录
            var subChildren = GetChildren(child.Id, documents);

            if (subChildren == null || subChildren.Count == 0)
            {
                children.Add(new
                {
                    label = child.Name,
                    lastUpdate = child.CreatedAt,
                    Url = child.Url,
                    key = child.Id,
                    child.Description,
                    // 是否启用
                    disabled = child.IsCompleted == false
                });
            }
            else
            {
                children.Add(new
                {
                    label = child.Name,
                    key = child.Id,
                    Url = child.Url,
                    child.Description,
                    lastUpdate = child.CreatedAt,
                    children = subChildren,
                    // 是否启用
                    disabled = child.IsCompleted == false
                });
            }
        }

        return children;
    }
}