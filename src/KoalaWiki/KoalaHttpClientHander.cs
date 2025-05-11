using System.Diagnostics;
using System.Text.Json;
using Newtonsoft.Json;
using Serilog;

namespace KoalaWiki;

public sealed class KoalaHttpClientHandler : HttpClientHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        Log.Logger.Information("HTTP {Method} {Uri}", request.Method, request.RequestUri);

        var json = JsonConvert.DeserializeObject<dynamic>(await request.Content.ReadAsStringAsync());
        // 增加max_token，从max_completion_tokens读取
        if (json != null && json.max_completion_tokens != null)
        {
            var maxToken = json.max_completion_tokens;
            if (maxToken != null)
            {
                json.max_tokens = maxToken;
                json.max_completion_tokens = null;
            }


            var model = $"{json.model}";

            if (model.StartsWith("qwen3", StringComparison.CurrentCultureIgnoreCase))
            {
                // 关闭推理模式
                json.enable_thinking = false;
            }

            // 重写请求体
            request.Content = new StringContent(JsonConvert.SerializeObject(json),
                System.Text.Encoding.UTF8, "application/json");
        }
        else
        {
            var model = $"{json.model}";


            if (model.StartsWith("qwen3", StringComparison.CurrentCultureIgnoreCase))
            {
                // 关闭推理模式
                json.enable_thinking = false;
                // 重写请求体
                request.Content = new StringContent(JsonConvert.SerializeObject(json),
                    System.Text.Encoding.UTF8, "application/json");
            }
        }

        // 1. 启动计时
        var stopwatch = Stopwatch.StartNew();
        // 2. 发送请求
        var response = await base.SendAsync(request, cancellationToken)
            .ConfigureAwait(false);
        // 3. 停止计时
        stopwatch.Stop();
        // 4. 记录简洁日志
        Log.Logger.Information(
            "HTTP {Method} {Uri} => {StatusCode} in {ElapsedMilliseconds}ms",
            request.Method,
            request.RequestUri,
            (int)response.StatusCode,
            stopwatch.ElapsedMilliseconds
        );
        return response;
    }
}