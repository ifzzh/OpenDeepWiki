using KoalaWiki.Services;
using ModelContextProtocol.Protocol;
using System.Text.Json;

namespace KoalaWiki.MCP.Tools;

/// <summary>
/// 认证工具
/// </summary>
public class AuthTool
{
    private readonly AuthService _authService;
    private readonly ILogger<AuthTool> _logger;

    public AuthTool(AuthService authService, ILogger<AuthTool> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="password">密码</param>
    /// <returns>登录结果</returns>
    public async Task<string> LoginAsync(string username, string password)
    {
        try
        {
            var result = await _authService.LoginAsync(username, password);
            if (!result.Success)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = result.ErrorMessage
                });
            }

            return JsonSerializer.Serialize(new
            {
                success = true,
                token = result.Token,
                refreshToken = result.RefreshToken,
                user = new
                {
                    id = result.User.Id,
                    name = result.User.Name,
                    email = result.User.Email,
                    role = result.User.Role,
                    avatar = result.User.Avatar
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "用户登录失败");
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "登录失败，请稍后再试"
            });
        }
    }

    /// <summary>
    /// 用户注册
    /// </summary>
    /// <param name="username">用户名</param>
    /// <param name="email">邮箱</param>
    /// <param name="password">密码</param>
    /// <returns>注册结果</returns>
    public async Task<string> RegisterAsync(string username, string email, string password)
    {
        try
        {
            var result = await _authService.RegisterAsync(username, email, password);
            if (!result.Success)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = result.ErrorMessage
                });
            }

            return JsonSerializer.Serialize(new
            {
                success = true,
                message = "注册成功"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "用户注册失败");
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "注册失败，请稍后再试"
            });
        }
    }

    /// <summary>
    /// GitHub登录
    /// </summary>
    /// <param name="code">授权码</param>
    /// <returns>登录结果</returns>
    public async Task<string> GitHubLoginAsync(string code)
    {
        try
        {
            var result = await _authService.GitHubLoginAsync(code);
            if (!result.Success)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = result.ErrorMessage
                });
            }

            return JsonSerializer.Serialize(new
            {
                success = true,
                token = result.Token,
                refreshToken = result.RefreshToken,
                user = new
                {
                    id = result.User.Id,
                    name = result.User.Name,
                    email = result.User.Email,
                    role = result.User.Role,
                    avatar = result.User.Avatar
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GitHub登录失败");
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "GitHub登录失败，请稍后再试"
            });
        }
    }

    /// <summary>
    /// Google登录
    /// </summary>
    /// <param name="idToken">ID令牌</param>
    /// <returns>登录结果</returns>
    public async Task<string> GoogleLoginAsync(string idToken)
    {
        try
        {
            var result = await _authService.GoogleLoginAsync(idToken);
            if (!result.Success)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = result.ErrorMessage
                });
            }

            return JsonSerializer.Serialize(new
            {
                success = true,
                token = result.Token,
                refreshToken = result.RefreshToken,
                user = new
                {
                    id = result.User.Id,
                    name = result.User.Name,
                    email = result.User.Email,
                    role = result.User.Role,
                    avatar = result.User.Avatar
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google登录失败");
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Google登录失败，请稍后再试"
            });
        }
    }

    /// <summary>
    /// 刷新令牌
    /// </summary>
    /// <param name="refreshToken">刷新令牌</param>
    /// <returns>刷新结果</returns>
    public async Task<string> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken);
            if (!result.Success)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = result.ErrorMessage
                });
            }

            return JsonSerializer.Serialize(new
            {
                success = true,
                token = result.Token,
                refreshToken = result.RefreshToken
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "刷新令牌失败");
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "刷新令牌失败，请重新登录"
            });
        }
    }
} 