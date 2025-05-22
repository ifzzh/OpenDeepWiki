'use client';

import { Button, Dropdown, Typography } from 'antd';
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
    const params = new URLSearchParams(searchParams);
    params.set('locale', locale);
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentLocale = getCurrentLocale();
  
  const getLanguageLabel = (locale: string) => {
    switch (locale) {
      case 'zh-CN': return '中文(简体)';
      case 'en-US': return 'English (US)';
      case 'zh-TW': return '中文(繁體)';
      case 'ja': return '日本語';
      case 'ko': return '한국어';
      case 'de': return 'Deutsch';
      case 'fr': return 'Français';
      case 'es': return 'Español';
      case 'it': return 'Italiano';
      case 'pt': return 'Português';
      case 'ru': return 'Русский';
      case 'ar': return 'العربية';
      case 'nl': return 'Nederlands';
      case 'tr': return 'Türkçe';
      case 'vi': return 'Tiếng Việt';
      case 'id': return 'Bahasa Indonesia';
      case 'th': return 'ไทย';
      case 'hi': return 'हिन्दी';
      default: return locale;
    }
  };

  // 按地区对语言进行分组
  const languageGroups = {
    asia: ['zh-CN', 'zh-TW', 'ja', 'ko', 'hi'],
    europe: ['en-US', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'nl', 'tr'],
    others: ['ar', 'vi', 'id', 'th']
  };

  // 生成分组下拉菜单项
  const items = [
    {
      key: 'asia-group',
      type: "group" as const,
      label: (
        <div className="language-group-label">
          {t('language.asia', '亚洲')}
        </div>
      ),
      children: languageGroups.asia.map(locale => ({
        key: locale,
        label: (
          <div className={`language-item ${currentLocale === locale ? 'active' : ''}`}>
            <Text className={`${currentLocale === locale ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
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
      label: (
        <div className="language-group-label">
          {t('language.europe', '欧美')}
        </div>
      ),
      children: languageGroups.europe.map(locale => ({
        key: locale,
        label: (
          <div className={`language-item ${currentLocale === locale ? 'active' : ''}`}>
            <Text className={`${currentLocale === locale ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
              {getLanguageLabel(locale)}
            </Text>
          </div>
        ),
        onClick: () => switchLanguage(locale),
      }))
    },
    {
      key: 'others-group',
      type: "group" as const,
      label: (
        <div className="language-group-label">
          {t('language.others', '其他')}
        </div>
      ),
      children: languageGroups.others.map(locale => ({
        key: locale,
        label: (
          <div className={`language-item ${currentLocale === locale ? 'active' : ''}`}>
            <Text className={`${currentLocale === locale ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
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
      case 'nl': return 'Nl';
      case 'tr': return 'Tr';
      case 'vi': return 'Vi';
      case 'id': return 'Id';
      case 'th': return 'Th';
      case 'hi': return 'Hi';
      default: return locale.substring(0, 2);
    }
  };

  return (
    <>
      <style jsx>{`
        .language-switcher {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
          overflow: hidden;
        }

        .language-switcher::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(37, 99, 235, 0.1) 0%, 
            rgba(59, 130, 246, 0.05) 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          border-radius: 8px;
        }

        .language-switcher:hover::before {
          opacity: 1;
        }

        .language-switcher:hover {
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.2), 0 4px 20px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .language-button {
          position: relative;
          z-index: 1;
          background: transparent !important;
          border: none !important;
          transition: all 0.3s ease;
        }

        .language-icon {
          transition: all 0.3s ease;
        }

        .language-switcher:hover .language-icon {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .language-text {
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .language-switcher:hover .language-text {
          color: #2563eb;
          text-shadow: 0 0 8px rgba(37, 99, 235, 0.3);
        }

        /* 下拉菜单样式 */
        :global(.ant-dropdown) {
          backdrop-filter: blur(10px);
        }

        :global(.ant-dropdown .ant-dropdown-menu) {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 0 20px rgba(37, 99, 235, 0.1);
          border-radius: 12px;
          padding: 8px;
        }

        :global(.language-group-label) {
          font-weight: 600;
          color: #475569;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 12px 4px;
        }

        :global(.language-item) {
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        :global(.language-item::before) {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.1), transparent);
          transition: left 0.4s ease;
        }

        :global(.language-item:hover::before) {
          left: 100%;
        }

        :global(.language-item:hover) {
          background: rgba(37, 99, 235, 0.05);
          transform: translateX(4px);
        }

        :global(.language-item.active) {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
        }

        :global(.language-item.active::after) {
          content: '';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: #2563eb;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
        }

        /* 响应式优化 */
        @media (max-width: 768px) {
          .language-switcher:hover {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .language-switcher,
          .language-button,
          .language-icon,
          .language-text,
          :global(.language-item) {
            transition: none;
          }
        }
      `}</style>

      <div className="language-switcher">
        <Dropdown 
          menu={{ items }} 
          trigger={['click']} 
          placement="bottomRight"
          overlayClassName="language-dropdown"
        >
          <Button 
            type="text"
            className="language-button text-slate-600 hover:text-slate-800 hover:bg-slate-100 h-10 w-auto px-3 rounded-lg flex items-center justify-center"
          >
            <GlobalOutlined className="language-icon" />
            <span className="language-text text-xs font-medium ml-1">
              {getLanguageShortLabel(currentLocale)}
            </span>
          </Button>
        </Dropdown>
      </div>
    </>
  );
};

export default LanguageSwitcher; 