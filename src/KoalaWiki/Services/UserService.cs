using FastService;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Domains.Users;
using KoalaWiki.Dto;
using KoalaWiki.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Mapster;
using Microsoft.AspNetCore.Authorization;

namespace KoalaWiki.Services;

/// <summary>
/// 用户管理服务
/// </summary>
[Tags("User")]
[Filter(typeof(ResultFilter))]
[Authorize(Roles = "admin")]
public class UserService(IKoalaWikiContext dbContext, ILogger<UserService> logger) : FastApi
{
    /// <summary>
    /// 获取用户列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="keyword">搜索关键词</param>
    /// <returns>用户列表</returns>
    public async Task<PageDto<UserInfoDto>> GetUserListAsync(int page, int pageSize, string? keyword)
    {
        var query = dbContext.Users.AsNoTracking();

        // 如果有关键词，则按名称或邮箱搜索
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(u => u.Name.Contains(keyword) || u.Email.Contains(keyword));
        }

        // 按创建时间降序排序
        query = query.OrderByDescending(u => u.CreatedAt);

        // 计算总数
        var total = await query.CountAsync();

        // 获取分页数据
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // 将实体映射为DTO
        var userDtos = users.Select(u => u.Adapt<UserInfoDto>()).ToList();

        return new PageDto<UserInfoDto>(total, userDtos);
    }

    /// <summary>
    /// 获取用户详情
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>用户详情</returns>
    public async Task<ResultDto<UserInfoDto>> GetUserAsync(string id)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return ResultDto<UserInfoDto>.Fail("用户不存在");
        }

        // 将实体映射为DTO
        var userDto = user.Adapt<UserInfoDto>();

        return ResultDto<UserInfoDto>.Success(userDto);
    }

    /// <summary>
    /// 创建用户
    /// </summary>
    /// <param name="createUserDto">用户信息</param>
    /// <returns>创建结果</returns>
    public async Task<ResultDto<UserInfoDto>> CreateUserAsync(CreateUserDto createUserDto)
    {
        try
        {
            // 检查用户名是否已存在
            var existingUsername = await dbContext.Users.AnyAsync(u => u.Name == createUserDto.Name);
            if (existingUsername)
            {
                return ResultDto<UserInfoDto>.Fail("用户名已存在");
            }

            // 检查邮箱是否已存在
            var existingEmail = await dbContext.Users.AnyAsync(u => u.Email == createUserDto.Email);
            if (existingEmail)
            {
                return ResultDto<UserInfoDto>.Fail("邮箱已被注册");
            }

            // 将DTO映射为实体
            var user = new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = createUserDto.Name,
                Email = createUserDto.Email,
                Password = createUserDto.Password,
                Role = createUserDto.Role,
                Avatar = createUserDto.Avatar ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            // 保存用户
            await dbContext.Users.AddAsync(user);
            await dbContext.SaveChangesAsync();

            // 将实体映射为DTO
            var userDto = user.Adapt<UserInfoDto>();

            return ResultDto<UserInfoDto>.Success(userDto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "创建用户失败");
            return ResultDto<UserInfoDto>.Fail("创建用户失败，请稍后再试");
        }
    }

    /// <summary>
    /// 更新用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <param name="updateUserDto">用户信息</param>
    /// <returns>更新结果</returns>
    public async Task<ResultDto<UserInfoDto>> UpdateUserAsync(string id, UpdateUserDto updateUserDto)
    {
        try
        {
            var existingUser = await dbContext.Users.FindAsync(id);
            if (existingUser == null)
            {
                return ResultDto<UserInfoDto>.Fail("用户不存在");
            }

            // 如果修改了用户名，检查是否已存在
            if (existingUser.Name != updateUserDto.Name)
            {
                var existingUsername = await dbContext.Users.AnyAsync(u => u.Name == updateUserDto.Name && u.Id != id);
                if (existingUsername)
                {
                    return ResultDto<UserInfoDto>.Fail("用户名已存在");
                }
            }

            // 如果修改了邮箱，检查是否已存在
            if (existingUser.Email != updateUserDto.Email)
            {
                var existingEmail = await dbContext.Users.AnyAsync(u => u.Email == updateUserDto.Email && u.Id != id);
                if (existingEmail)
                {
                    return ResultDto<UserInfoDto>.Fail("邮箱已被注册");
                }
            }

            // 更新用户信息
            existingUser.Name = updateUserDto.Name;
            existingUser.Email = updateUserDto.Email;
            existingUser.Role = updateUserDto.Role;
            existingUser.Avatar = updateUserDto.Avatar ?? existingUser.Avatar;
            existingUser.UpdatedAt = DateTime.UtcNow;

            // 如果提供了新密码，则更新密码
            if (!string.IsNullOrEmpty(updateUserDto.Password))
            {
                existingUser.Password = updateUserDto.Password;
            }

            // 保存更改
            dbContext.Users.Update(existingUser);
            await dbContext.SaveChangesAsync();

            // 将实体映射为DTO
            var userDto = existingUser.Adapt<UserInfoDto>();

            return ResultDto<UserInfoDto>.Success(userDto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "更新用户失败");
            return ResultDto<UserInfoDto>.Fail("更新用户失败，请稍后再试");
        }
    }

    /// <summary>
    /// 删除用户
    /// </summary>
    /// <param name="id">用户ID</param>
    /// <returns>删除结果</returns>
    public async Task<ResultDto<bool>> DeleteUserAsync(string id)
    {
        try
        {
            var user = await dbContext.Users.FindAsync(id);
            if (user == null)
            {
                return ResultDto<bool>.Fail("用户不存在");
            }

            // 删除用户
            dbContext.Users.Remove(user);
            await dbContext.SaveChangesAsync();

            return ResultDto<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "删除用户失败");
            return ResultDto<bool>.Fail("删除用户失败，请稍后再试");
        }
    }
}