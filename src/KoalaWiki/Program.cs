using KoalaWiki.CodeMap;
using KoalaWiki.Core.DataAccess;
using KoalaWiki.DataMigration;
using KoalaWiki.Extensions;
using KoalaWiki.Git;
using KoalaWiki.KoalaWarehouse;
using KoalaWiki.MCP;
using KoalaWiki.Options;
using KoalaWiki.WarehouseProcessing;
using Mapster;
using Microsoft.AspNetCore.Http.Features;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateLogger();

#region Options

OpenAIOptions.InitConfig(builder.Configuration);
builder.Configuration.GetSection(DocumentOptions.Name)
    .Get<DocumentOptions>();

#endregion

// 设置文件上传大小
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024 * 1024 * OpenAIOptions.MaxFileLimit; // 10MB
});

builder.WebHost.UseKestrel((options =>
{
    options.Limits.MaxRequestBodySize = 1024 * 1024 * OpenAIOptions.MaxFileLimit; // 10MB
}));

builder.Services.AddHttpContextAccessor();
builder.Services.AddKoalaMcp();
builder.Services.AddSerilog(Log.Logger);

builder.Services.AddOpenApi();
builder.Services.WithFast();
builder.Services.AddSingleton<WarehouseStore>();
builder.Services.AddSingleton<GitService>();
builder.Services.AddSingleton<DocumentsService>();
builder.Services.AddSingleton<GlobalMiddleware>();

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
builder.Services.AddHostedService<WarehouseProcessingTask>();
builder.Services.AddHostedService<DataMigrationTask>();
builder.Services.AddHostedService<WarehouseDescriptionTask>();
builder.Services.AddHostedService<BuildCodeIndex>();

builder.Services.AddDbContext(builder.Configuration);

builder.Services.AddMapster();

var app = builder.Build();

// 添加自动迁移代码
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<IKoalaWikiContext>();
    await dbContext.RunMigrateAsync();
}

// 添加中间件
app.UseSerilogRequestLogging();

app.UseCors("AllowAll");
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapMcp("/api");

app.UseMiddleware<GlobalMiddleware>();

app.MapSitemap();

app.MapFast();

app.Run();