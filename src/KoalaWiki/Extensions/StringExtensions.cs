using System.Runtime.CompilerServices;

namespace KoalaWiki.Extensions
{
    public static class StringExtensions
    {
        /// <summary>
        /// 对字符串进行安全的 Trim 处理。如果字符串为 null 或空白，则返回空字符串；
        /// 否则返回去除首尾空白后的字符串。
        /// </summary>
        /// <param name="value">要处理的字符串（可为空）</param>
        /// <returns>Trim 后的字符串，或空字符串</returns>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string GetTrimmedValueOrEmpty(this string? value)
        {
            return !string.IsNullOrWhiteSpace(value) ? value.Trim() : value ?? string.Empty;
        }
    }
}
