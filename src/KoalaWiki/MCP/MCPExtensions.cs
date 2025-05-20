using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using KoalaWiki.MCP.Tools;
using ModelContextProtocol.Protocol;
using Serilog;

namespace KoalaWiki.MCP;

public static class MCPExtensions
{
    public static IServiceCollection AddKoalaMcp(this IServiceCollection service)
    {
        service.AddScoped<WarehouseTool>();
        service.AddScoped<AuthTool>();
        service.AddMcpServer()
            .WithListToolsHandler((async (context, token) =>
            {
                var httpContext = context.Services!.GetService<IHttpContextAccessor>()?.HttpContext;
                if (httpContext == null)
                {
                    throw new Exception("HttpContext is null");
                }

                var owner = httpContext.Request.Query["owner"].ToString();
                var name = httpContext.Request.Query["name"].ToString();

                var input = """
                    {
                        "type": "object",
                        "properties": {
                          "question": {
                            "type": "string",
                            "description": "Provide detailed technical analysis of {owner}/{name} repository. Include specific code-related keywords for precise search. Ask about architecture, implementation mechanisms, functionality, usage methods, or other technical aspects. More specific questions yield better targeted analysis."
                          }
                        },
                        "required": ["question"]
                    }
                    """.Replace("{owner}", owner)
                    .Replace("{name}", name);
                
                var loginInput = """
                    {
                        "type": "object",
                        "properties": {
                          "username": {
                            "type": "string",
                            "description": "用户名或邮箱"
                          },
                          "password": {
                            "type": "string",
                            "description": "密码"
                          }
                        },
                        "required": ["username", "password"]
                    }
                    """;
                
                var registerInput = """
                    {
                        "type": "object",
                        "properties": {
                          "username": {
                            "type": "string",
                            "description": "用户名"
                          },
                          "email": {
                            "type": "string",
                            "description": "邮箱"
                          },
                          "password": {
                            "type": "string",
                            "description": "密码"
                          }
                        },
                        "required": ["username", "email", "password"]
                    }
                    """;
                
                var githubLoginInput = """
                    {
                        "type": "object",
                        "properties": {
                          "code": {
                            "type": "string",
                            "description": "GitHub授权码"
                          }
                        },
                        "required": ["code"]
                    }
                    """;
                
                var googleLoginInput = """
                    {
                        "type": "object",
                        "properties": {
                          "idToken": {
                            "type": "string",
                            "description": "Google ID令牌"
                          }
                        },
                        "required": ["idToken"]
                    }
                    """;
                
                var refreshTokenInput = """
                    {
                        "type": "object",
                        "properties": {
                          "refreshToken": {
                            "type": "string",
                            "description": "刷新令牌"
                          }
                        },
                        "required": ["refreshToken"]
                    }
                    """;

                // 删除特殊字符串
                var mcpName = $"{owner}{name}CodeRepositoryAnalyzer";
                mcpName = Regex.Replace(mcpName, @"[^a-zA-Z0-9]", "");
                mcpName = mcpName.Length > 50 ? mcpName.Substring(0, 50) : mcpName;
                mcpName = mcpName.ToLower();

                return await Task.FromResult(new ListToolsResult()
                {
                    Tools =
                    [
                        new Tool()
                        {
                            Name = mcpName,
                            Description =
                                $"Generate detailed technical documentation for the {owner}/{name} GitHub repository based on user inquiries. Analyzes repository structure, code components, APIs, dependencies, and implementation patterns to create comprehensive developer documentation with troubleshooting guides, architecture explanations, customization options, and implementation insights.",
                            InputSchema =
                                JsonSerializer.Deserialize<JsonElement>(input),
                        },
                        new Tool()
                        {
                            Name = "login",
                            Description = "用户登录",
                            InputSchema = JsonSerializer.Deserialize<JsonElement>(loginInput),
                        },
                        new Tool()
                        {
                            Name = "register",
                            Description = "用户注册",
                            InputSchema = JsonSerializer.Deserialize<JsonElement>(registerInput),
                        },
                        new Tool()
                        {
                            Name = "githubLogin",
                            Description = "GitHub登录",
                            InputSchema = JsonSerializer.Deserialize<JsonElement>(githubLoginInput),
                        },
                        new Tool()
                        {
                            Name = "googleLogin",
                            Description = "Google登录",
                            InputSchema = JsonSerializer.Deserialize<JsonElement>(googleLoginInput),
                        },
                        new Tool()
                        {
                            Name = "refreshToken",
                            Description = "刷新令牌",
                            InputSchema = JsonSerializer.Deserialize<JsonElement>(refreshTokenInput),
                        }
                    ],
                });
            }))
            .WithCallToolHandler((async (context, token) =>
            {
                if (context.Params?.Name.EndsWith("CodeRepositoryAnalyzer",
                        StringComparison.CurrentCultureIgnoreCase) == true)
                {
                    var warehouse = context.Services!.GetService<WarehouseTool>();

                    var question = context.Params.Arguments["question"].ToString();
                    var sw = Stopwatch.StartNew();

                    var response = await warehouse.GenerateDocumentAsync(question);

                    sw.Stop();

                    Log.Logger.Information("functionName {functionName} Execution Time: {ExecutionTime}ms",
                        context.Params.Name, sw.ElapsedMilliseconds);

                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }
                else if (context.Params?.Name == "login")
                {
                    var auth = context.Services!.GetService<AuthTool>();
                    var username = context.Params.Arguments["username"].ToString();
                    var password = context.Params.Arguments["password"].ToString();
                    
                    var response = await auth.LoginAsync(username, password);
                    
                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }
                else if (context.Params?.Name == "register")
                {
                    var auth = context.Services!.GetService<AuthTool>();
                    var username = context.Params.Arguments["username"].ToString();
                    var email = context.Params.Arguments["email"].ToString();
                    var password = context.Params.Arguments["password"].ToString();
                    
                    var response = await auth.RegisterAsync(username, email, password);
                    
                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }
                else if (context.Params?.Name == "githubLogin")
                {
                    var auth = context.Services!.GetService<AuthTool>();
                    var code = context.Params.Arguments["code"].ToString();
                    
                    var response = await auth.GitHubLoginAsync(code);
                    
                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }
                else if (context.Params?.Name == "googleLogin")
                {
                    var auth = context.Services!.GetService<AuthTool>();
                    var idToken = context.Params.Arguments["idToken"].ToString();
                    
                    var response = await auth.GoogleLoginAsync(idToken);
                    
                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }
                else if (context.Params?.Name == "refreshToken")
                {
                    var auth = context.Services!.GetService<AuthTool>();
                    var refreshToken = context.Params.Arguments["refreshToken"].ToString();
                    
                    var response = await auth.RefreshTokenAsync(refreshToken);
                    
                    return new CallToolResponse()
                    {
                        Content =
                        [
                            new Content()
                            {
                                Type = "text",
                                Text = response
                            }
                        ]
                    };
                }

                throw new Exception("Tool not found");
            }))
            .WithHttpTransport();

        return service;
    }
}