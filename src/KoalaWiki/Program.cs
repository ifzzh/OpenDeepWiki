using System.Net.Mime;
using System.Text.Json;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.Extensions;
using KoalaWiki.Git;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.MCP;
using KoalaWiki.Options;
using KoalaWiki.Tools;
using Mapster;
using ModelContextProtocol;
using ModelContextProtocol.Protocol.Types;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateLogger();

#region Options

OpenAIOptions.Config(builder.Configuration);
Console.WriteLine(OpenAIOptions.ToStr());

#endregion

builder.Services.AddHttpContextAccessor();
builder.Services.AddKoalaMcp();
builder.Services.AddSerilog(Log.Logger);

builder.Services.AddOpenApi();
builder.Services.WithFast();
builder.Services.AddSingleton<WarehouseStore>();
builder.Services.AddSingleton<GitService>();
builder.Services.AddSingleton<DocumentsService>();

builder.Services
    .AddCors(options =>
    {
        options.AddPolicy("AllowAll", configurePolicy => configurePolicy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
    });

builder.Services.AddHostedService<WarehouseTask>();

builder.Services.AddDbContext(builder.Configuration);

builder.Services.AddMapster();

var app = builder.Build();

// 添加自动迁移代码
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<IKoalaWikiContext>();
    await dbContext.RunMigrateAsync();
}

app.UseCors("AllowAll");
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapMcp("/api");
app.MapSitemap();

app.MapFast();

app.Run();