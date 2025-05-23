using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.MCP.Tools;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.WebEncoders.Testing;
using ModelContextProtocol.Protocol;
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
                var name = context.Server.ServerOptions.Capabilities.Experimental["name"].ToString();
                var owner = context.Server.ServerOptions.Capabilities.Experimental["owner"].ToString();

                var dbContext = context.Services.GetService<IKoalaWikiContext>();

                var prompt = await dbContext.Warehouses
                    .AsNoTracking()
                    .Where(x => x.OrganizationName.ToLower() == owner.ToLower() &&
                                x.Name.ToLower() == name.ToLower())
                    .Select(x => x.Prompt)
                    .FirstOrDefaultAsync(cancellationToken: token);

                var descript =
                    $"Generate detailed technical documentation for the {owner}/{name} GitHub repository based on user inquiries. Analyzes repository structure, code components, APIs, dependencies, and implementation patterns to create comprehensive developer documentation with troubleshooting guides, architecture explanations, customization options, and implementation insights.";
                if (!string.IsNullOrEmpty(prompt))
                {
                    descript = JsonEncodedText.Encode(prompt, JavaScriptTestEncoder.UnsafeRelaxedJsonEscaping)
                        .ToString();
                }

                var input = """
                    {
                        "type": "object",
                        "properties": {
                          "question": {
                            "type": "string",
                            "description": "The relevant keywords for your retrieval of {owner}/{name} or a question content"
                          }
                        },
                        "required": ["question"]
                    }
                    """.Replace("{owner}", owner)
                    .Replace("{name}", name);


                // 删除特殊字符串
                var mcpName = $"{owner}{name}Analyzer";
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
                                descript,
                            InputSchema =
                                JsonSerializer.Deserialize<JsonElement>(input),
                        }
                    ],
                });
            }))
            .WithListResourcesHandler(
                ((context, token) => new ValueTask<ListResourcesResult>(new ListResourcesResult())))
            .WithCallToolHandler((async (context, token) =>
            {
                var warehouse = context.Services!.GetService<WarehouseTool>();

                var question = context.Params?.Arguments?["question"].ToString();
                var sw = Stopwatch.StartNew();

                var response = await warehouse.GenerateDocumentAsync(context.Server, question);

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
            }))
            .WithHttpTransport(options =>
            {
                options.ConfigureSessionOptions += async (context, serverOptions, token) =>
                {
                    var owner = context.Request.Query["owner"].ToString();
                    var name = context.Request.Query["name"].ToString();

                    serverOptions.InitializationTimeout = TimeSpan.FromSeconds(300);
                    serverOptions.Capabilities!.Experimental = new Dictionary<string, object>();
                    serverOptions.Capabilities.Experimental.Add("owner", owner);
                    serverOptions.Capabilities.Experimental.Add("name", name);
                    await Task.CompletedTask;
                };
            });

        return service;
    }
}