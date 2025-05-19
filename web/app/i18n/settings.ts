export const fallbackLng = 'zh-CN';
export const defaultNS = 'common';

export const languages = [
  'zh-CN',   // 中文(简体)
  'en-US',   // 英文(美国)
  'zh-TW',   // 中文(繁体)
  'ja',      // 日语
  'ko',      // 韩语
  'de',      // 德语
  'fr',      // 法语
  'es',      // 西班牙语
  'it',      // 意大利语
  'pt',      // 葡萄牙语
  'ru',      // 俄语
  'ar',      // 阿拉伯语
  'hi',      // 印地语
  'nl',      // 荷兰语
  'tr',      // 土耳其语
  'vi',      // 越南语
  'id',      // 印尼语
  'th'       // 泰语
];

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns
  };
} 