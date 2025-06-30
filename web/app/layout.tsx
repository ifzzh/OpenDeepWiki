import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import './globals.css';
import '@ant-design/v5-patch-for-react-19';
import Script from 'next/script';
import { Metadata } from 'next';
import { getTranslation } from './i18n/server';
import { fallbackLng } from './i18n/settings';

// 网站结构化数据
const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'KoalaWiki',
  alternateName: 'OpenDeepWiki',
  url: 'https://opendeep.wiki',
  description: '专业的技术文档平台，提供开源项目文档管理、API文档生成、知识库构建等服务',
  inLanguage: ['zh-CN', 'en-US', 'zh-TW', 'ja', 'ko'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://opendeep.wiki/search/{search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  },
  publisher: {
    '@type': 'Organization',
    name: 'KoalaWiki',
    url: 'https://opendeep.wiki',
    logo: {
      '@type': 'ImageObject',
      url: 'https://opendeep.wiki/logo.png',
      width: 512,
      height: 512
    },
    sameAs: [
      'https://github.com/AIDotNet',
      'https://twitter.com/AIDotNet'
    ]
  }
};

// 组织结构化数据
const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'KoalaWiki',
  url: 'https://opendeep.wiki',
  logo: 'https://opendeep.wiki/logo.png',
  description: '专业的技术文档平台和知识库管理系统',
  foundingDate: '2024',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Chinese', 'English', 'Japanese', 'Korean']
  },
  sameAs: [
    'https://github.com/AIDotNet',
    'https://twitter.com/AIDotNet'
  ]
};

// 获取动态元数据
export async function generateMetadata(): Promise<Metadata> {
  // 使用默认语言
  const locale = fallbackLng;

  // 获取翻译函数
  const { t } = await getTranslation(locale, 'common');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://opendeep.wiki';

  return {
    title: {
      template: '%s | KoalaWiki - 专业技术文档平台',
      default: t('title') + ' - 专业技术文档平台',
    },
    description: t('description') + ' 支持Markdown、API文档生成、多语言、版本控制等功能。',
    keywords: [
      'KoalaWiki', 'OpenDeepWiki', '技术文档', '文档管理', 'API文档', 
      '知识库', '开源项目', 'Markdown', 'GitHub', 'Gitee',
      '文档平台', '在线文档', '协作文档', '版本控制', '多语言文档'
    ],
    authors: [{ name: 'KoalaWiki Team', url: 'https://opendeep.wiki' }],
    creator: 'KoalaWiki',
    publisher: 'KoalaWiki',
    applicationName: 'KoalaWiki',
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/',
      languages: {
        'zh-CN': '/zh-CN',
        'en-US': '/en-US',
      },
    },
    openGraph: {
      title: t('title') + ' - 专业技术文档平台',
      description: t('description') + ' 支持Markdown、API文档生成、多语言、版本控制等功能。',
      url: baseUrl,
      siteName: 'KoalaWiki',
      locale: locale,
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'KoalaWiki - 专业技术文档平台',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title') + ' - 专业技术文档平台',
      description: t('description'),
      creator: '@KoalaWiki',
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/site.webmanifest',
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 5,
      userScalable: true,
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || 'google-site-verification-code',
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_SITE_VERIFICATION,
      other: {
        'baidu-site-verification': '44a79feb3bf1e77660bdbc00e1808896',
        'msvalidate.01': '61D1D1BFCB7FDB548E411C30FC69B058',
      },
    },
    category: '技术文档',
    classification: '文档管理平台',
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': 'KoalaWiki',
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': '#1677ff',
      'theme-color': '#1677ff',
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
      default: return zhCN;
    }
  };

  const antdLocale = getAntdLocale(locale);

  return (
    <html style={{
      overflowX: 'hidden'
    }} lang={locale}>
      <head>
        <link rel="dns-prefetch" href="//hm.baidu.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <meta name="msvalidate.01" content="61D1D1BFCB7FDB548E411C30FC69B058" />
        <meta name="baidu-site-verification" content="44a79feb3bf1e77660bdbc00e1808896" />
        <meta name="format-detection" content="telephone=no,email=no,address=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KoalaWiki" />
        <meta name="msapplication-TileColor" content="#1677ff" />
        <meta name="theme-color" content="#1677ff" />
        
        {/* 图标 */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#1677ff" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData)
          }}
        />
        
        {/* 外部资源 */}
        <script src="/tailwindcss.js"></script>
        
        {/* 百度统计 */}
        <Script id="baidu-analytics" strategy="afterInteractive">
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
        
        {/* Google Analytics (如果配置了) */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body>
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