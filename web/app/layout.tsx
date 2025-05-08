import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './globals.css';
import '@ant-design/v5-patch-for-react-19';
import Script from 'next/script';


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 从环境变量NEXT_PUBLIC_API_URL读取
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  return (
    <html lang="zh-CN">
      <head>
        <meta name="msvalidate.01" content="61D1D1BFCB7FDB548E411C30FC69B058" />
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
      </head>
      <body >
        <Script id="api-url"
          type="text/javascript"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              console.log('API_URL', '${apiUrl}');
              window.API_URL = '${apiUrl}';
              `
          }}
        />


        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
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
  )
}