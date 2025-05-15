using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using KoalaWiki.MCP.Tools;
using ModelContextProtocol.Protocol.Types;
using Serilog;

namespace KoalaWiki.MCP;

public static class MCPExtensions
{
    public static IServiceCollection AddKoalaMcp(this IServiceCollection service)
    {
        service.AddScoped<WarehouseTool>();
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

                var mcpName = $"{owner}{name}CodeRepositoryAnalyzer";

                // 删除特殊字符串
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

                throw new Exception("Tool not found");
            }))
            .WithHttpTransport();

        return service;
    }
}