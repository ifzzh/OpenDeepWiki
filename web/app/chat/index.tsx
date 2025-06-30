'use client';

import React, { useState, useEffect } from 'react';
import { Button,  notification, Tooltip } from 'antd';
import { MessageOutlined, CloseOutlined, MinusOutlined, ExpandOutlined, CompressOutlined, RobotOutlined, CopyOutlined, RedoOutlined, DeleteOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import Workspace from './workspace';

// 保持原有的内部消息类型
export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createAt: number;
  updateAt: number;
  extra: {
    thinking?: string;
    toolCalls?: Array<{
      id: string;
      functionName: string;
      arguments: string;
    }>;
    status?: 'loading' | 'complete' | 'error';
    imageContents?: Array<{
      data: string;
      mimeType: string;
    }>;
  };
  meta: {
    avatar: string;
    title: string;
    backgroundColor: string;
  };
}

// 文件类型接口
interface ReferenceFile {
  path: string;
  title: string;
  content?: string;
}

const useStyles = createStyles(({ css, token }) => ({
  // 悬浮球按钮
  floatingButton: css`
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(24, 144, 255, 0.25);
    z-index: 1000;
    font-size: 24px;
    border: none;
    background: linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive});
    color: white;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 24px rgba(24, 144, 255, 0.35);
    }
    
    &:active {
      transform: scale(0.95);
    }
  `,

  // 聊天窗口容器
  chatContainer: css`
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 550px;
    height: 700px;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    border: 1px solid ${token.colorBorderSecondary};
    
    &.minimized {
      height: 60px;
      border-radius: ${token.borderRadiusLG}px ${token.borderRadiusLG}px ${token.borderRadiusSM}px ${token.borderRadiusSM}px;
    }
    
    &.maximized {
      width: 580px;
      height: 100%;
      bottom: 0px;
      right: 0px;
    }
    
    &.embedded {
      position: relative !important;
      bottom: auto !important;
      right: auto !important;
      width: 100% !important;
      height: 100% !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
  `,

  // 聊天窗口头部
  chatHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${token.paddingMD}px ${token.paddingLG}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: linear-gradient(to right, ${token.colorBgContainer}, ${token.colorBgLayout});
    min-height: 60px;
  `,

  headerTitle: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    flex: 1;
    
    .title-icon {
      color: ${token.colorPrimary};
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${token.colorBgContainer};
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    
    .title-text {
      font-size: ${token.fontSizeLG}px;
      font-weight: 600;
      margin: 0;
      color: ${token.colorTextHeading};
    }
  `,

  headerActions: css`
    display: flex;
    gap: ${token.marginSM}px;
    
    .ant-btn {
      border: none;
      background: transparent;
      color: ${token.colorTextSecondary};
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      
      &:hover {
        background: ${token.colorBgTextHover};
        color: ${token.colorText};
      }
    }
  `,

  // 聊天内容区域
  chatContent: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: ${token.colorBgLayout};
  `,

  messagesContainer: css`
    flex: 1;
    overflow: hidden;
  `,

  inputContainer: css`
  `,

  // 空状态
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${token.paddingLG}px;
    text-align: center;
    color: ${token.colorTextSecondary};
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: ${token.marginMD}px;
      color: ${token.colorPrimary};
      opacity: 0.8;
    }
    
    .empty-title {
      font-size: ${token.fontSizeLG}px;
      margin-bottom: ${token.marginSM}px;
      color: ${token.colorText};
      font-weight: 600;
    }
    
    .empty-description {
      font-size: ${token.fontSize}px;
      line-height: 1.6;
      max-width: 280px;
      margin: 0 auto;
    }
    
    .empty-button {
      margin-top: ${token.marginMD}px;
      border-radius: ${token.borderRadiusLG}px;
    }
  `
}));

interface FloatingChatProps {
  // 应用配置
  appId?: string;
  organizationName?: string;
  repositoryName?: string;

  // 外观配置
  expandIcon?: string; // base64 图标
  closeIcon?: string; // base64 图标
  title?: string;
  theme?: 'light' | 'dark';

  // 功能配置
  enableDomainValidation?: boolean;
  allowedDomains?: string[];
  embedded?: boolean; // 嵌入式模式

  // 回调函数
  onError?: (error: string) => void;
  onValidationFailed?: (domain: string) => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({
  appId,
  organizationName = 'default',
  repositoryName = 'default',
  expandIcon,
  closeIcon,
  title = 'AI 助手',
  theme = 'light',
  enableDomainValidation = false,
  allowedDomains = [],
  embedded = false,
  onError,
  onValidationFailed,
}) => {
  const { styles } = useStyles();

  // 状态管理
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [domainValidated, setDomainValidated] = useState(false);


  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        // 域名验证（嵌入式模式下跳过）
        if (!embedded && enableDomainValidation && allowedDomains.length > 0) {
          const currentDomain = window.location.hostname;
          const isValidDomain = allowedDomains.some(domain =>
            currentDomain === domain || currentDomain.endsWith('.' + domain)
          );

          if (!isValidDomain) {
            onValidationFailed?.(currentDomain);
            return;
          }
        }

        setDomainValidated(true);

        // 嵌入式模式下自动展开
        if (embedded) {
          setTimeout(() => {
            setIsExpanded(true);
          }, 100);
        }

      } catch (error) {
        console.error('初始化失败:', error);
        onError?.('初始化失败');
      }
    };

    init();
  }, [organizationName, repositoryName, enableDomainValidation, allowedDomains, embedded]);

  // 切换展开状态
  const toggleExpanded = () => {
    if (!domainValidated) {
      notification.error({
        message: '域名验证失败',
        description: '当前域名未被授权使用此功能',
      });
      return;
    }

    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };

  // 最小化
  const minimize = () => {
    setIsMinimized(true);
  };

  // 最大化/还原
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // 关闭
  const close = () => {
    setIsExpanded(false);
    setIsMinimized(false);
    setIsMaximized(false);
  };


  // 如果域名验证失败，不渲染组件
  if (enableDomainValidation && !domainValidated) {
    return null;
  }

  return (
    <>
      {!embedded && !isExpanded && domainValidated && (
        <Button
          type="primary"
          className={styles.floatingButton}
          onClick={toggleExpanded}
          aria-label="打开聊天"
        >
          <MessageOutlined />
        </Button>
      )}

      {/* 聊天窗口 */}
      {(isExpanded || embedded) && domainValidated && (
        <div
          className={`${styles.chatContainer} ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${embedded ? 'embedded' : ''}`}
        >
          {/* 聊天窗口头部 */}
          {!embedded && (
            <div className={styles.chatHeader}>
              <div className={styles.headerActions}>
                {!isMinimized ? (
                  <>
                    <Tooltip title={isMaximized ? '恢复大小' : '最大化'}>
                      <Button
                        type="text"
                        icon={isMaximized ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={toggleMaximize}
                        aria-label={isMaximized ? '恢复大小' : '最大化'}
                      />
                    </Tooltip>
                    <Tooltip title="最小化">
                      <Button
                        type="text"
                        icon={<MinusOutlined />}
                        onClick={minimize}
                        aria-label="最小化"
                      />
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip title="展开">
                    <Button
                      type="text"
                      icon={<ExpandOutlined />}
                      onClick={minimize}
                      aria-label="展开"
                    />
                  </Tooltip>
                )}
                <Tooltip title="关闭">
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={close}
                    aria-label="关闭"
                  />
                </Tooltip>
              </div>
            </div>
          )}

          {/* 聊天内容区域 - 最小化时隐藏 */}
          {!isMinimized && (
            <div className={styles.chatContent}>
              <Workspace organizationName={organizationName} name={repositoryName} />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChat;
