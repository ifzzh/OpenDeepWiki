'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConfigProvider, theme } from 'antd';
import FloatingChat from '../index';
import './page.css';

// 嵌入式聊天页面组件的内容部分
const EmbeddedChatContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // 从 URL 参数中获取配置
    const appId = searchParams.get('appId');
    const organizationName = searchParams.get('organizationName') || 'default';
    const repositoryName = searchParams.get('repositoryName') || 'default';
    const title = searchParams.get('title') || 'AI 助手';
    const expandIcon = searchParams.get('expandIcon');
    const closeIcon = searchParams.get('closeIcon');
    const themeMode = searchParams.get('theme') || 'light';

    setConfig({
      appId,
      organizationName,
      repositoryName,
      title,
      expandIcon,
      closeIcon,
      theme: themeMode,
      // 嵌入式模式下默认展开，不显示悬浮球
      embedded: true,
    });
  }, [searchParams]);

  if (!config) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        正在加载...
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: config.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <div style={{
        width: '100%',
        height: '100% !important',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <EmbeddedFloatingChat {...config} />
      </div>
    </ConfigProvider>
  );
};

// 嵌入式聊天页面组件
const EmbeddedChatPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        正在加载...
      </div>
    }>
      <EmbeddedChatContent />
    </Suspense>
  );
};

// 嵌入式悬浮球组件（去掉悬浮球按钮，直接显示聊天界面）
interface EmbeddedFloatingChatProps {
  appId?: string;
  organizationName?: string;
  repositoryName?: string;
  expandIcon?: string;
  closeIcon?: string;
  title?: string;
  theme?: 'light' | 'dark';
  embedded?: boolean;
}

const EmbeddedFloatingChat: React.FC<EmbeddedFloatingChatProps> = (props) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: props.theme === 'dark' ? '#141414' : '#ffffff',
    }}>
      <FloatingChatContent {...props} />
    </div>
  );
};

// 聊天内容组件（从 FloatingChat 中提取的聊天界面部分）
const FloatingChatContent: React.FC<EmbeddedFloatingChatProps> = ({
  appId,
  organizationName = 'default',
  repositoryName = 'default',
  title = 'AI 助手',
  theme = 'light',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: theme === 'dark' ? '#ffffff' : '#000000'
      }}>
        正在初始化...
      </div>
    );
  }

  // 使用原有的 FloatingChat 组件，但强制展开状态
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style jsx global>{`
        .koala-chat-embedded .koala-floating-button {
          display: none !important;
        }
        
        .koala-chat-embedded .koala-chat-container {
          position: relative !important;
          bottom: auto !important;
          right: auto !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        .koala-chat-embedded .koala-chat-header {
          border-bottom: 1px solid ${theme === 'dark' ? '#424242' : '#d9d9d9'};
          background: ${theme === 'dark' ? '#1f1f1f' : '#ffffff'};
        }
        
        .koala-chat-embedded .koala-header-title {
          color: ${theme === 'dark' ? '#ffffff' : '#262626'};
        }
        
        .koala-chat-embedded .koala-chat-content {
          background: ${theme === 'dark' ? '#141414' : '#ffffff'};
        }
        
        .koala-chat-embedded{
            height: 100vh !important;
        }
      `}</style>
      
      <div className="koala-chat-embedded">
        <EmbeddedFloatingChatInner
          appId={appId}
          organizationName={organizationName}
          repositoryName={repositoryName}
          title={title}
          theme={theme}
        />
      </div>
    </div>
  );
};

// 内部聊天组件（简化版的 FloatingChat）
const EmbeddedFloatingChatInner: React.FC<EmbeddedFloatingChatProps> = (props) => {
  // 直接导入并使用主组件，但通过 CSS 隐藏悬浮球并调整容器样式
  return (
    <FloatingChat
      {...props}
      embedded={true}
      enableDomainValidation={false} // 嵌入式模式下禁用域名验证
    />
  );
};

export default EmbeddedChatPage; 