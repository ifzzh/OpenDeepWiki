using System.IO.Compression;
using System.Text;
using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains;
using KoalaWiki.Dto;
using KoalaWiki.Entities;
using KoalaWiki.Functions;
using KoalaWiki.KoalaWarehouse;
using LibGit2Sharp;
using MapsterMapper;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.Services;

public class WarehouseService(IKoalaWikiContext access, IMapper mapper, WarehouseStore warehouseStore) : FastApi
{
    /// <summary>
    /// 查询上次提交的仓库
    /// </summary>
    /// <returns></returns>
    public async Task<object> GetLastWarehouseAsync(string address)
    {
        // 判断是否.git结束，如果不是需要添加
        if (!address.EndsWith(".git"))
        {
            address += ".git";
        }

        var query = await access.Warehouses
            .AsNoTracking()
            .Where(x => x.Address == address)
            .FirstOrDefaultAsync();

        // 如果没有找到仓库，返回空列表
        if (query == null)
        {
            throw new NotFoundException("仓库不存在");
        }

        return new
        {
            query.Name,
            query.Address,
            query.Description,
            query.Version,
            query.Status,
            query.Error
        };
    }

    public async Task<DocumentCommitRecord?> GetChangeLogAsync(string owner, string name)
    {
        var warehouse = await access.Warehouses
            .AsNoTracking()
            .Where(x => x.Name == name && x.OrganizationName == owner)
            .FirstOrDefaultAsync();

        // 如果没有找到仓库，返回空列表
        if (warehouse == null)
        {
            throw new NotFoundException($"仓库不存在，请检查仓库名称和组织名称:{owner} {name}");
        }

        var commit = await access.DocumentCommitRecords.Where(x => x.WarehouseId == warehouse.Id)
            .ToListAsync();

        var value = new StringBuilder();

        foreach (var record in commit)
        {
            // 拼接一个更新模板
            value.AppendLine($"## {record.LastUpdate:yyyy-MM-dd HH:mm:ss} {record.Title}");
            value.AppendLine($" {record.CommitMessage}");
        }

        return new DocumentCommitRecord()
        {
            CommitId = "",
            CommitMessage = value.ToString(),
            CreatedAt = DateTime.Now,
            Title = "更新日志",
            LastUpdate = DateTime.Now,
            WarehouseId = warehouse.Id,
        };
    }

    /// <summary>
    /// 上传并且提交仓库
    /// </summary>
    public async Task UploadAndSubmitWarehouseAsync(HttpContext context)
    {
        // 获取文件
        var file = context.Request.Form.Files["file"];
        if (file == null)
        {
            context.Response.StatusCode = 400;
            throw new Exception("没有文件上传");
        }

        // 只支持压缩包.zip 或gzip 
        if (!file.FileName.EndsWith(".zip") && !file.FileName.EndsWith(".gz") && !file.FileName.EndsWith(".tar") &&
            !file.FileName.EndsWith(".br"))
        {
            context.Response.StatusCode = 400;
            throw new Exception("只支持zip，gz，tar，br格式的文件");
        }

        var organization = context.Request.Form["organization"].ToString();
        var repositoryName = context.Request.Form["repositoryName"].ToString();

        // 后缀名
        var suffix = file.FileName.Split('.').Last();

        var fileInfo = new FileInfo(Path.Combine(Constant.GitPath, organization, repositoryName + "." + suffix));

        if (fileInfo.Directory?.Exists == false)
        {
            fileInfo.Directory.Create();
        }

        await using (var stream = new FileStream(fileInfo.FullName, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var name = fileInfo.FullName.Replace(".zip", "")
            .Replace(".gz", "")
            .Replace(".tar", "")
            .Replace(".br", "");
        // 解压文件，根据后缀名判断解压方式
        if (file.FileName.EndsWith(".zip"))
        {
            // 解压
            var zipPath = fileInfo.FullName.Replace(".zip", "");
            ZipFile.ExtractToDirectory(fileInfo.FullName, zipPath, true);
            
        }
        else if (file.FileName.EndsWith(".gz"))
        {
            using var inputStream = new FileStream(fileInfo.FullName, FileMode.Open);
            await using (var outputStream = new FileStream(name, FileMode.Create))
            await using (var decompressionStream = new GZipStream(inputStream, CompressionMode.Decompress))
            {
                await decompressionStream.CopyToAsync(outputStream);
            }
        }
        else if (file.FileName.EndsWith(".tar"))
        {
            using var inputStream = new FileStream(fileInfo.FullName, FileMode.Open);
            await using (var outputStream = new FileStream(name, FileMode.Create))
            await using (var decompressionStream = new GZipStream(inputStream, CompressionMode.Decompress))
            {
                await decompressionStream.CopyToAsync(outputStream);
            }
        }
        else if (file.FileName.EndsWith(".br"))
        {
            await using var inputStream = new FileStream(fileInfo.FullName, FileMode.Open);
            await using var outputStream = new FileStream(name, FileMode.Create);
            await using var decompressionStream = new BrotliStream(inputStream, CompressionMode.Decompress);
            await decompressionStream.CopyToAsync(outputStream);
        }
        
        
        // 如果解压以后目录下只有一个文件夹，那么就将这个文件夹的内容移动到上级目录
        var directory = new DirectoryInfo(name);
        if (directory.Exists)
        {
            var directories = directory.GetDirectories();
            if (directories.Length == 1)
            {
                var subDirectory = directories[0];
                foreach (var fileInfo1 in subDirectory.GetFiles())
                {
                    fileInfo1.MoveTo(Path.Combine(directory.FullName, fileInfo1.Name));
                }

                foreach (var directoryInfo in subDirectory.GetDirectories())
                {
                    directoryInfo.MoveTo(Path.Combine(directory.FullName, directoryInfo.Name));
                }

                subDirectory.Delete(true);
            }
        }

        var value = await access.Warehouses.FirstOrDefaultAsync(x =>
            x.OrganizationName == organization && x.Name == repositoryName);
        // 判断这个仓库是否已经添加
        if (value?.Status is WarehouseStatus.Completed or WarehouseStatus.Pending or WarehouseStatus.Processing)

        {
            throw new Exception("存在相同名称的渠道");
        }

        // 删除旧的仓库
        var oldWarehouse = await access.Warehouses
            .Where(x => x.OrganizationName == organization && x.Name == repositoryName)
            .ExecuteDeleteAsync();

        var entity = new Warehouse
        {
            OrganizationName = organization,
            Name = repositoryName,
            Address = name,
            Description = string.Empty,
            Version = string.Empty,
            Error = string.Empty,
            Prompt = string.Empty,
            Branch = string.Empty,
            Type = "file",
            CreatedAt = DateTime.UtcNow,
            OptimizedDirectoryStructure = string.Empty,
            Id = Guid.NewGuid().ToString()
        };

        await access.Warehouses.AddAsync(entity);

        await access.SaveChangesAsync();

        await warehouseStore.WriteAsync(entity);

        await context.Response.WriteAsJsonAsync(new
        {
            code = 200,
            message = "提交成功"
        });
    }

    /// <summary>
    /// 提交仓库
    /// </summary>
    public async Task SubmitWarehouseAsync(WarehouseInput input, HttpContext context)
    {
        try
        {
            if (!input.Address.EndsWith(".git"))
            {
                input.Address += ".git";
            }

            var value = await access.Warehouses.FirstOrDefaultAsync(x =>
                x.Address.ToLower() == input.Address.ToLower());
            // 判断这个仓库是否已经添加
            if (value?.Status is WarehouseStatus.Completed or WarehouseStatus.Pending or WarehouseStatus.Processing)

            {
                throw new Exception("存在相同名称的渠道");
            }

            // 删除旧的仓库
            var oldWarehouse = await access.Warehouses
                .Where(x => x.Address.ToLower() == input.Address.ToLower())
                .ExecuteDeleteAsync();

            var entity = mapper.Map<Warehouse>(input);
            entity.Name = string.Empty;
            entity.Description = string.Empty;
            entity.Version = string.Empty;
            entity.Error = string.Empty;
            entity.Prompt = string.Empty;
            entity.Branch = string.Empty;
            entity.Type = "git";
            entity.CreatedAt = DateTime.UtcNow;
            entity.OptimizedDirectoryStructure = string.Empty;
            entity.Id = Guid.NewGuid().ToString();
            await access.Warehouses.AddAsync(entity);

            await access.SaveChangesAsync();

            await warehouseStore.WriteAsync(entity);

            await context.Response.WriteAsJsonAsync(new
            {
                code = 200,
                message = "提交成功"
            });
        }
        catch (Exception e)
        {
            await context.Response.WriteAsJsonAsync(new
            {
                code = 500,
                message = e.Message
            });
        }
    }

    /// <summary>
    /// 获取仓库概述
    /// </summary>
    public async Task GetWarehouseOverviewAsync(string owner, string name, HttpContext context)
    {
        var query = await access.Warehouses
            .AsNoTracking()
            .Where(x => x.Name == name && x.OrganizationName == owner)
            .FirstOrDefaultAsync();

        // 如果没有找到仓库，返回空列表
        if (query == null)
        {
            throw new NotFoundException($"仓库不存在，请检查仓库名称和组织名称:{owner} {name}");
        }

        var document = await access.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == query.Id)
            .FirstOrDefaultAsync();

        var overview = await access.DocumentOverviews.FirstOrDefaultAsync(x => x.DocumentId == document.Id);

        if (overview == null)
        {
            throw new NotFoundException("没有找到概述");
        }

        await context.Response.WriteAsJsonAsync(new
        {
            content = overview.Content,
            title = overview.Title
        });
    }

    /// <summary>
    /// 获取仓库列表的异步方法，支持分页和关键词搜索。
    /// </summary>
    /// <param name="page">当前页码，从1开始。</param>
    /// <param name="pageSize">每页显示的记录数。</param>
    /// <param name="keyword">搜索关键词，用于匹配仓库名称或地址。</param>
    /// <returns>返回一个包含总记录数和当前页仓库数据的分页结果对象。</returns>
    public async Task<PageDto<Warehouse>> GetWarehouseListAsync(int page, int pageSize, string keyword)
    {
        var query = access.Warehouses
            .AsNoTracking()
            .Where(x => x.Status == WarehouseStatus.Completed || x.Status == WarehouseStatus.Processing);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(x => x.Name.Contains(keyword) || x.Address.Contains(keyword));
        }

        var total = await query.CountAsync();
        var list = await query
            .Select(x => new Warehouse()
            {
                Id = x.Id,
                Name = x.Name,
                Address = x.Address,
                Description = x.Description,
                Version = x.Version,
                Status = x.Status,
                Error = x.Error,
                CreatedAt = x.CreatedAt,
                IsRecommended = x.IsRecommended,
                OrganizationName = x.OrganizationName,
                Prompt = x.Prompt,
                Branch = x.Branch,
                Email = x.Email,
                Type = x.Type,
            })
            .OrderByDescending(x => x.IsRecommended)
            .ThenByDescending(x => x.Status == WarehouseStatus.Completed)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PageDto<Warehouse>(total, list);
    }

    [EndpointSummary("获取指定仓库代码文件")]
    public async Task<ResultDto<string>> GetFileContent(string warehouseId, string path)
    {
        var query = await access.Documents
            .AsNoTracking()
            .Where(x => x.WarehouseId == warehouseId)
            .FirstOrDefaultAsync();

        if (query == null)
        {
            throw new NotFoundException("文件不存在");
        }

        var fileFunction = new FileFunction(query.GitPath);

        var result = await fileFunction.ReadFileAsync(path);

        return ResultDto<string>.Success(result);
    }
}