using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Dto;
using KoalaWiki.Entities;
using KoalaWiki.Git;
using KoalaWiki.KoalaWarehouse;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace KoalaWiki.Services;

/// <summary>
/// 仓库管理服务
/// </summary>
[Tags("Repository")]
public class RepositoryService(IKoalaWikiContext dbContext, ILogger<RepositoryService> logger, WarehouseStore warehouseStore) : FastApi
{
    /// <summary>
    /// 获取仓库列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="keyword">搜索关键词</param>
    /// <returns>仓库列表</returns>
    public async Task<PageDto<RepositoryInfoDto>> GetRepositoryListAsync(int page, int pageSize, string? keyword)
    {
        var query = dbContext.Warehouses.AsNoTracking();

        // 如果有关键词，则按名称或地址搜索
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(r => r.Name.Contains(keyword) || 
                                     r.Address.Contains(keyword) || 
                                     r.OrganizationName.Contains(keyword));
        }

        // 排序：先按推荐状态，再按完成状态，最后按创建时间
        query = query
            .OrderByDescending(x => x.IsRecommended)
            .ThenByDescending(x => x.Status == WarehouseStatus.Completed)
            .ThenByDescending(x => x.CreatedAt);

        // 按仓库名称和组织名称分组，保持排序一致性
        var groupedQuery = query
            .GroupBy(x => new { x.Name, x.OrganizationName })
            .Select(g => g.OrderByDescending(x => x.IsRecommended)
                .ThenByDescending(x => x.Status == WarehouseStatus.Completed)
                .ThenByDescending(x => x.CreatedAt)
                .FirstOrDefault());

        // 计算总数
        var total = await groupedQuery.CountAsync();

        // 获取分页数据
        var repositories = await groupedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 将实体映射为DTO
        var repositoryDtos = repositories.Select(r => r.Adapt<RepositoryInfoDto>()).ToList();

        return new PageDto<RepositoryInfoDto>(total, repositoryDtos);
    }

    /// <summary>
    /// 获取仓库详情
    /// </summary>
    /// <param name="id">仓库ID</param>
    /// <returns>仓库详情</returns>
    public async Task<ResultDto<RepositoryInfoDto>> GetRepositoryAsync(string id)
    {
        var repository = await dbContext.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (repository == null)
        {
            return ResultDto<RepositoryInfoDto>.Fail("仓库不存在");
        }

        // 将实体映射为DTO
        var repositoryDto = repository.Adapt<RepositoryInfoDto>();

        return ResultDto<RepositoryInfoDto>.Success(repositoryDto);
    }

    /// <summary>
    /// 根据组织名称和仓库名称获取仓库详情
    /// </summary>
    /// <param name="owner">组织名称</param>
    /// <param name="name">仓库名称</param>
    /// <param name="branch">分支名称（可选）</param>
    /// <returns>仓库详情</returns>
    public async Task<ResultDto<RepositoryInfoDto>> GetRepositoryByOwnerAndNameAsync(string owner, string name, string? branch = null)
    {
        var query = dbContext.Warehouses
            .AsNoTracking()
            .Where(r => r.OrganizationName == owner && r.Name == name);

        // 如果指定了分支，则按分支筛选
        if (!string.IsNullOrEmpty(branch))
        {
            query = query.Where(r => r.Branch == branch);
        }

        var repository = await query.FirstOrDefaultAsync();

        if (repository == null)
        {
            return ResultDto<RepositoryInfoDto>.Fail($"仓库不存在: {owner}/{name}{(branch != null ? $"/{branch}" : "")}");
        }

        // 将实体映射为DTO
        var repositoryDto = repository.Adapt<RepositoryInfoDto>();

        return ResultDto<RepositoryInfoDto>.Success(repositoryDto);
    }

    /// <summary>
    /// 创建Git仓库
    /// </summary>
    /// <param name="createDto">仓库信息</param>
    /// <returns>创建结果</returns>
    public async Task<ResultDto<RepositoryInfoDto>> CreateGitRepositoryAsync(CreateGitRepositoryDto createDto)
    {
        try
        {
            // 处理Git地址
            if (!createDto.Address.EndsWith(".git"))
            {
                createDto.Address += ".git";
            }

            // 解析仓库路径和组织名称
            var (_, organization) = GitService.GetRepositoryPath(createDto.Address);
            var names = createDto.Address.Split('/');
            var repositoryName = names[^1].Replace(".git", "");

            // 检查仓库是否已存在
            var existingRepo = await dbContext.Warehouses.FirstOrDefaultAsync(x =>
                x.OrganizationName == organization && 
                x.Name == repositoryName && 
                x.Branch == createDto.Branch);

            // 判断这个仓库是否已经添加
            if (existingRepo?.Status is WarehouseStatus.Completed)
            {
                return ResultDto<RepositoryInfoDto>.Fail("该仓库已存在且处于完成状态，不可重复创建");
            }
            else if (existingRepo?.Status is WarehouseStatus.Pending)
            {
                return ResultDto<RepositoryInfoDto>.Fail("该仓库已存在且处于待处理状态，请等待处理完成");
            }
            else if (existingRepo?.Status is WarehouseStatus.Processing)
            {
                return ResultDto<RepositoryInfoDto>.Fail("该仓库已存在且正在处理中，请稍后再试");
            }
            else if (!string.IsNullOrEmpty(createDto.Branch))
            {
                var branch = await dbContext.Warehouses
                    .AsNoTracking()
                    .Where(x => x.Branch == createDto.Branch && 
                                x.OrganizationName == organization &&
                                x.Name == repositoryName)
                    .FirstOrDefaultAsync();

                if (branch != null)
                {
                    return ResultDto<RepositoryInfoDto>.Fail("该分支已经存在");
                }
            }

            // 删除旧的仓库（如果存在）
            await dbContext.Warehouses
                .Where(x => x.OrganizationName == organization &&
                            x.Name == repositoryName && 
                            x.Branch == createDto.Branch)
                .ExecuteDeleteAsync();

            // 创建新仓库
            var entity = new Warehouse
            {
                Id = Guid.NewGuid().ToString(),
                OrganizationName = organization,
                Name = repositoryName,
                Address = createDto.Address,
                Description = string.Empty,
                Version = string.Empty,
                Error = string.Empty,
                Prompt = string.Empty,
                Branch = createDto.Branch,
                Type = "git",
                GitUserName = createDto.GitUserName,
                GitPassword = createDto.GitPassword,
                Email = createDto.Email,
                CreatedAt = DateTime.UtcNow,
                OptimizedDirectoryStructure = string.Empty,
                Status = WarehouseStatus.Pending
            };

            // 保存仓库
            await dbContext.Warehouses.AddAsync(entity);
            await dbContext.SaveChangesAsync();

            // 提交到仓库处理队列
            await warehouseStore.WriteAsync(entity);

            // 将实体映射为DTO
            var repositoryDto = entity.Adapt<RepositoryInfoDto>();

            return ResultDto<RepositoryInfoDto>.Success(repositoryDto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "创建Git仓库失败");
            return ResultDto<RepositoryInfoDto>.Fail($"创建Git仓库失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 更新仓库
    /// </summary>
    /// <param name="id">仓库ID</param>
    /// <param name="updateDto">更新信息</param>
    /// <returns>更新结果</returns>
    public async Task<ResultDto<RepositoryInfoDto>> UpdateRepositoryAsync(string id, UpdateRepositoryDto updateDto)
    {
        try
        {
            var repository = await dbContext.Warehouses.FindAsync(id);
            if (repository == null)
            {
                return ResultDto<RepositoryInfoDto>.Fail("仓库不存在");
            }

            // 更新仓库信息
            if (updateDto.Description != null)
            {
                repository.Description = updateDto.Description;
            }

            if (updateDto.IsRecommended.HasValue)
            {
                repository.IsRecommended = updateDto.IsRecommended.Value;
            }

            if (updateDto.Prompt != null)
            {
                repository.Prompt = updateDto.Prompt;
            }

            // 保存更改
            dbContext.Warehouses.Update(repository);
            await dbContext.SaveChangesAsync();

            // 将实体映射为DTO
            var repositoryDto = repository.Adapt<RepositoryInfoDto>();

            return ResultDto<RepositoryInfoDto>.Success(repositoryDto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "更新仓库失败");
            return ResultDto<RepositoryInfoDto>.Fail("更新仓库失败，请稍后再试");
        }
    }

    /// <summary>
    /// 删除仓库
    /// </summary>
    /// <param name="id">仓库ID</param>
    /// <returns>删除结果</returns>
    public async Task<ResultDto<bool>> DeleteRepositoryAsync(string id)
    {
        try
        {
            var repository = await dbContext.Warehouses.FindAsync(id);
            if (repository == null)
            {
                return ResultDto<bool>.Fail("仓库不存在");
            }

            // 删除仓库
            dbContext.Warehouses.Remove(repository);
            await dbContext.SaveChangesAsync();

            // 删除相关文档
            await dbContext.Documents
                .Where(d => d.WarehouseId == id)
                .ExecuteDeleteAsync();

            return ResultDto<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "删除仓库失败");
            return ResultDto<bool>.Fail("删除仓库失败，请稍后再试");
        }
    }

    /// <summary>
    /// 重新处理仓库
    /// </summary>
    /// <param name="id">仓库ID</param>
    /// <returns>处理结果</returns>
    public async Task<ResultDto<bool>> ReprocessRepositoryAsync(string id)
    {
        try
        {
            // 更新仓库状态为待处理
            await dbContext.Warehouses
                .Where(x => x.Id == id)
                .ExecuteUpdateAsync(x => x.SetProperty(y => y.Status, WarehouseStatus.Pending));

            var warehouse = await dbContext.Warehouses
                .AsNoTracking()
                .Where(x => x.Id == id)
                .FirstOrDefaultAsync();

            if (warehouse == null)
            {
                return ResultDto<bool>.Fail("仓库不存在");
            }

            // 提交到仓库处理队列
            await warehouseStore.WriteAsync(warehouse);

            return ResultDto<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "重新处理仓库失败");
            return ResultDto<bool>.Fail("重新处理仓库失败，请稍后再试");
        }
    }
} 