using Newtonsoft.Json;

namespace KoalaWiki.Options;

public class OpenAIOptions
{
    public static string ChatModel { get; set; } = string.Empty;

    public static string AnalysisModel { get; set; } = string.Empty;

    public static string ChatApiKey { get; set; } = string.Empty;

    public static string Endpoint { get; set; } = string.Empty;

    public static void Config(IConfiguration configuration)
    {
        ChatModel = configuration.GetValue<string>("CHAT_MODEL") ??
                    configuration.GetValue<string>("ChatModel") ?? string.Empty;
        AnalysisModel = configuration.GetValue<string>("ANALYSIS_MODEL") ??
                        configuration.GetValue<string>("AnalysisModel") ?? string.Empty;
        ChatApiKey = configuration.GetValue<string>("CHAT_API_KEY") ??
                     configuration.GetValue<string>("ChatApiKey") ?? string.Empty;
        Endpoint = configuration.GetValue<string>("ENDPOINT") ??
                   configuration.GetValue<string>("Endpoint") ?? string.Empty;

        // 检查参数
        if (string.IsNullOrEmpty(ChatModel))
        {
            throw new Exception("ChatModel is empty");
        }

        if (string.IsNullOrEmpty(ChatApiKey))
        {
            throw new Exception("ChatApiKey is empty");
        }

        if (string.IsNullOrEmpty(Endpoint))
        {
            throw new Exception("Endpoint is empty");
        }

        // 如果没设置分析模型则使用默认的
        if (string.IsNullOrEmpty(AnalysisModel))
        {
            AnalysisModel = ChatModel;
        }
    }

    public static string ToStr()
    {
        return $"ChatModel:{ChatModel},AnalysisModel:{AnalysisModel},ChatApiKey:{ChatApiKey},Endpoint:{Endpoint}";
    }
}