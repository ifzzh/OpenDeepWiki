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

        var model = $"{json.model}";

        // GPT o系列不能传递温度,并且使用max_completion_tokens
        if (model.StartsWith("o"))
        {
            json.Remove("temperature");
        }

        // 增加max_token，从max_completion_tokens读取
        if (json != null && json.max_completion_tokens != null && model.StartsWith("o") == false)
        {
            var maxToken = json.max_completion_tokens;
            if (maxToken != null)
            {
                json.max_tokens = maxToken;
                json.max_completion_tokens = null;
            }

            if (model.StartsWith("qwen3", StringComparison.CurrentCultureIgnoreCase))
            {
                // 关闭推理模式
                json.enable_thinking = false;
            }
        }
        else
        {
            if (model.StartsWith("qwen3", StringComparison.CurrentCultureIgnoreCase))
            {
                // 关闭推理模式
                json.enable_thinking = false;
            }
        }

        // 重写请求体
        request.Content = new StringContent(JsonConvert.SerializeObject(json),
            System.Text.Encoding.UTF8, "application/json");

        // 1. 启动计时
        var stopwatch = Stopwatch.StartNew();
        // 2. 发送请求
        var response = await base.SendAsync(request, cancellationToken)
            .ConfigureAwait(false);
        // 3. 停止计时
        stopwatch.Stop();

        // 如果响应错误那么输出错误信息
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            Log.Logger.Error(
                "HTTP {Method} {Uri} => {StatusCode} in {ElapsedMilliseconds}ms, Error: {Error}",
                request.Method,
                request.RequestUri,
                (int)response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                errorContent
            );
            Log.Logger.Information("Request JSON: {RequestJson}",
                await request.Content?.ReadAsStringAsync(cancellationToken) ?? "");

            throw new HttpRequestException(
                $"Request failed with status code {(int)response.StatusCode}: {errorContent}");
        }
        else
        {
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
}