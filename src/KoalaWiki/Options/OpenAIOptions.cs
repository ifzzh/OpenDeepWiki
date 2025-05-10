using KoalaWiki.Extensions;
using Newtonsoft.Json;

namespace KoalaWiki.Options;

public class OpenAIOptions
{
    public static string ChatModel { get; set; } = string.Empty;

    public static string AnalysisModel { get; set; } = string.Empty;

    public static string ChatApiKey { get; set; } = string.Empty;

    public static string Endpoint { get; set; } = string.Empty;

    public static string ModelProvider { get; set; } = string.Empty;

    public static void InitConfig(IConfiguration configuration)
    {
        ChatModel = (configuration.GetValue<string>("CHAT_MODEL") ??
                     configuration.GetValue<string>("ChatModel") ?? string.Empty).GetTrimmedValueOrEmpty();
        AnalysisModel = (configuration.GetValue<string>("ANALYSIS_MODEL") ??
                         configuration.GetValue<string>("AnalysisModel") ?? string.Empty).GetTrimmedValueOrEmpty();
        ChatApiKey = (configuration.GetValue<string>("CHAT_API_KEY") ??
                      configuration.GetValue<string>("ChatApiKey") ?? string.Empty).GetTrimmedValueOrEmpty();
        Endpoint = (configuration.GetValue<string>("ENDPOINT") ??
                    configuration.GetValue<string>("Endpoint") ?? string.Empty).GetTrimmedValueOrEmpty();
        ModelProvider = (configuration.GetValue<string>("MODEL_PROVIDER") ??
                         configuration.GetValue<string>("ModelProvider")).GetTrimmedValueOrEmpty();

        if (string.IsNullOrEmpty(ModelProvider))
        {
            ModelProvider = "OpenAI";
        }

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
}