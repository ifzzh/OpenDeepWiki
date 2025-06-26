'use client';

import {  Dropdown, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from '../i18n/client';
import { Button } from '@lobehub/ui';

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
      default: return locale;
    }
  };

  // 只保留中文和英文
  const languages = ['zh-CN', 'en-US'];

  // 生成下拉菜单项
  const items = languages.map(locale => ({
    key: locale,
    label: (
      <div className={`${currentLocale === locale ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
        {getLanguageLabel(locale)}
      </div>
    ),
    onClick: () => switchLanguage(locale),
  }));

  // 获取当前语言简称显示
  const getLanguageShortLabel = (locale: string) => {
    switch (locale) {
      case 'zh-CN': return '中';
      case 'en-US': return 'En';
      default: return locale.substring(0, 2);
    }
  };

  return (
    <Dropdown 
      menu={{ items }} 
      trigger={['click']} 
      placement="bottomRight"
    >
      <Button 
        type="text"
      >
        <GlobalOutlined />
        <span className="text-xs font-medium ml-1">
          {getLanguageShortLabel(currentLocale)}
        </span>
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher; 