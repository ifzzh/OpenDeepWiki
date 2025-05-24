import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import zhTW from 'antd/locale/zh_TW';
import jaJP from 'antd/locale/ja_JP';
import koKR from 'antd/locale/ko_KR';
import deDE from 'antd/locale/de_DE';
import frFR from 'antd/locale/fr_FR';
import esES from 'antd/locale/es_ES';
import itIT from 'antd/locale/it_IT';
import ptBR from 'antd/locale/pt_BR';
import ruRU from 'antd/locale/ru_RU';
import arEG from 'antd/locale/ar_EG';
import hiIN from 'antd/locale/hi_IN';
import nlNL from 'antd/locale/nl_NL';
import trTR from 'antd/locale/tr_TR';
import viVN from 'antd/locale/vi_VN';
import idID from 'antd/locale/id_ID';
import thTH from 'antd/locale/th_TH';
import './globals.css';
import '@ant-design/v5-patch-for-react-19';
import Script from 'next/script';
import { Metadata } from 'next';
import { getTranslation } from './i18n/server';
import { fallbackLng } from './i18n/settings';

// 获取动态元数据
export async function generateMetadata(): Promise<Metadata> {
  // 使用默认语言
  const locale = fallbackLng;

  // 获取翻译函数
  const { t } = await getTranslation(locale, 'common');

  return {
    title: {
      template: '%s | OpenDeekWiki',
      default: t('title'),
    },
    description: t('description'),
    keywords: ['OpenDeekWiki', '知识库', '文档管理', '技术文档', 'API文档', '开源'],
    authors: [{ name: 'OpenDeekWiki Team' }],
    creator: 'OpenDeekWiki',
    publisher: 'OpenDeekWiki',
    formatDetection: {
      telephone: false,
    },
    metadataBase: new URL('https://opendeep.wiki'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: 'https://opendeep.wiki',
      siteName: 'OpenDeekWiki',
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      creator: '@OpenDeekWiki',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
    },
    verification: {
      google: 'google-site-verification-code',
      other: {
        'baidu-site-verification': '44a79feb3bf1e77660bdbc00e1808896',
      },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 注意：我们将使用客户端组件来处理语言切换
  // 默认使用中文
  const locale = fallbackLng;

  // 根据当前语言选择Ant Design的语言包
  const getAntdLocale = (locale: string) => {
    switch (locale) {
      case 'zh-CN': return zhCN;
      case 'en-US': return enUS;
      case 'zh-TW': return zhTW;
      case 'ja': return jaJP;
      case 'ko': return koKR;
      case 'de': return deDE;
      case 'fr': return frFR;
      case 'es': return esES;
      case 'it': return itIT;
      case 'pt': return ptBR;
      case 'ru': return ruRU;
      case 'ar': return arEG;
      case 'hi': return hiIN;
      case 'nl': return nlNL;
      case 'tr': return trTR;
      case 'vi': return viVN;
      case 'id': return idID;
      case 'th': return thTH;
      default: return zhCN;
    }
  };

  const antdLocale = getAntdLocale(locale);

  return (
    <html style={{
      overflowX: 'hidden'
    }} lang={locale}>
      <head>
        <meta name="msvalidate.01" content="61D1D1BFCB7FDB548E411C30FC69B058" />
        <meta name="baidu-site-verification" content="44a79feb3bf1e77660bdbc00e1808896" />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://cdn.tailwindcss.com"></script>
        <Script >
          {`
            var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?44a79feb3bf1e77660bdbc00e1808896";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })();
          `}
        </Script>
      </head>
      <body >
        <AntdRegistry>
          <ConfigProvider
            locale={antdLocale}
            theme={{
              token: {
                colorPrimary: '#1677ff',
              },
              algorithm: theme.defaultAlgorithm,
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}