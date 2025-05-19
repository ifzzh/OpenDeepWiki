'use client';

import { Button, Dropdown, Space, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from '../i18n/client';

const { Text } = Typography;

const LanguageSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const getCurrentLocale = () => {
    const locale = searchParams.get('locale');
    return locale || 'zh-CN';
  };

  const switchLanguage = (locale: string) => {
    // 创建新的查询参数对象，保留原有参数并更新locale
    const params = new URLSearchParams(searchParams);
    params.set('locale', locale);
    
    // 构建新的URL并导航
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentLocale = getCurrentLocale();
  
  const getLanguageLabel = (locale: string) => {
    switch (locale) {
      case 'zh-CN':
        return '中文(简体)';
      case 'en-US':
        return 'English (US)';
      case 'zh-TW':
        return '中文(繁體)';
      case 'ja':
        return '日本語';
      case 'ko':
        return '한국어';
      case 'de':
        return 'Deutsch';
      case 'fr':
        return 'Français';
      case 'es':
        return 'Español';
      case 'it':
        return 'Italiano';
      case 'pt':
        return 'Português';
      case 'ru':
        return 'Русский';
      case 'ar':
        return 'العربية';
      case 'nl':
        return 'Nederlands';
      case 'tr':
        return 'Türkçe';
      case 'vi':
        return 'Tiếng Việt';
      case 'id':
        return 'Bahasa Indonesia';
      case 'th':
        return 'ไทย';
      default:
        return locale;
    }
  };

  // 按地区对语言进行分组
  const languageGroups = {
    asia: ['zh-CN', 'zh-TW', 'ja', 'ko'],
    europe: ['en-US', 'de'],
    middle_east: ['ar']
  };

  // 生成分组下拉菜单项
  const items = [
    {
      key: 'asia-group',
      type: "group" as const,
      label: t('language.asia', '亚洲'),
      children: languageGroups.asia.map(locale => ({
        key: locale,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
            <Text 
              style={{ 
                fontWeight: currentLocale === locale ? 'bold' : 'normal',
                color: currentLocale === locale ? '#1677ff' : undefined 
              }}
            >
              {getLanguageLabel(locale)}
            </Text>
          </div>
        ),
        onClick: () => switchLanguage(locale),
      }))
    },
    {
      key: 'europe-group',
      type: "group" as const,
      label: t('language.europe', '欧美'),
      children: languageGroups.europe.map(locale => ({
        key: locale,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
            <Text 
              style={{ 
                fontWeight: currentLocale === locale ? 'bold' : 'normal',
                color: currentLocale === locale ? '#1677ff' : undefined 
              }}
            >
              {getLanguageLabel(locale)}
            </Text>
          </div>
        ),
        onClick: () => switchLanguage(locale),
      }))
    }
  ];

  // 获取当前语言简称显示
  const getLanguageShortLabel = (locale: string) => {
    switch (locale) {
      case 'zh-CN': return '中';
      case 'zh-TW': return '繁';
      case 'en-US': return 'En';
      case 'ja': return '日';
      case 'ko': return '한';
      case 'de': return 'De';
      case 'fr': return 'Fr';
      case 'es': return 'Es';
      case 'it': return 'It';
      case 'pt': return 'Pt';
      case 'ru': return 'Ru';
      case 'ar': return 'Ar';
      case 'hi': return 'Hi';
      case 'nl': return 'Nl';
      case 'tr': return 'Tr';
      case 'vi': return 'Vi';
      case 'id': return 'Id';
      case 'th': return 'Th';
      default: return locale.substring(0, 2);
    }
  };

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button 
        type="text"
        icon={<GlobalOutlined />}
        style={{
          color: 'white',
          height: 44,
          width: 44,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Space>
          {getLanguageShortLabel(currentLocale)}
        </Space>
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher; 