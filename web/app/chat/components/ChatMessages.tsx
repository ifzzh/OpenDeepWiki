'use client';

import React, { useEffect, useRef } from 'react';
import { Avatar, Button, Spin, Typography, Dropdown, type MenuProps, message, Modal, Tag } from 'antd';
import { MoreOutlined, CopyOutlined, RedoOutlined, DeleteOutlined, UserOutlined, RobotOutlined, LoadingOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { Markdown } from '@lobehub/ui';

const { Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    height: 100%;
    padding: ${token.paddingMD}px;
    background: ${token.colorBgLayout};
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: ${token.colorBorderSecondary};
      border-radius: 3px;
    }
  `,
  messageList: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginLG}px;
    width: 100%;
  `,
  messageItem: css`
    display: flex;
    gap: ${token.marginSM}px;
    align-items: flex-start;
    position: relative;
    width: 100%;
  `,
  userMessage: css`
    flex-direction: row-reverse;
    
    .message-content {
      background: linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive});
      color: ${token.colorWhite};
      margin-left: ${token.marginLG}px;
      border-radius: 18px 4px 18px 18px;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
    }
    
    .message-meta {
      justify-content: flex-end;
      margin-right: 12px;
    }
  `,
  assistantMessage: css`
    flex-direction: row;
    
    .message-content {
      background: ${token.colorBgContainer};
      color: ${token.colorText};
      margin-right: ${token.marginLG}px;
      border-radius: 4px 18px 18px 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid ${token.colorBorderSecondary};
    }
    
    .message-meta {
      margin-left: 12px;
    }
  `,
  avatar: css`
    flex-shrink: 0;
    
    .ant-avatar {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 2px solid ${token.colorBgContainer};
    }
  `,
  messageContent: css`
    flex: 1;
    padding: ${token.paddingMD}px ${token.paddingLG}px;
    max-width: calc(100% - 80px);
    position: relative;
    word-break: break-word;
    overflow-wrap: break-word;
    
    &:hover .message-actions {
      opacity: 1;
    }
  `,
  messageActions: css`
    position: absolute;
    top: ${token.paddingXS}px;
    right: ${token.paddingXS}px;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
    
    .ant-btn {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(4px);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `,
  messageMeta: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  thinking: css`
    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingSM}px ${token.paddingMD}px;
    margin-bottom: ${token.marginSM}px;
    
    .thinking-header {
      display: flex;
      align-items: center;
      gap: ${token.marginXS}px;
      margin-bottom: ${token.marginXS}px;
      font-weight: 500;
      color: ${token.colorTextSecondary};
      font-size: ${token.fontSizeSM}px;
    }
    
    .thinking-content {
      color: ${token.colorText};
      font-size: ${token.fontSizeSM}px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
  `,
  toolCall: css`
    background: ${token.colorInfoBg};
    border: 1px solid ${token.colorInfoBorder};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingSM}px ${token.paddingMD}px;
    margin-bottom: ${token.marginSM}px;
    
    .tool-header {
      display: flex;
      align-items: center;
      gap: ${token.marginXS}px;
      margin-bottom: ${token.marginXS}px;
      font-weight: 500;
      color: ${token.colorInfo};
      font-size: ${token.fontSizeSM}px;
    }
    
    .tool-content {
      color: ${token.colorText};
      font-size: ${token.fontSizeSM}px;
      line-height: 1.6;
      font-family: ${token.fontFamilyCode};
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
  `,
  loadingMessage: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    padding: ${token.paddingSM}px;
    color: ${token.colorTextSecondary};
    
    .ant-spin {
      margin-right: 8px;
    }
  `,
  errorMessage: css`
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
    color: ${token.colorError};
    border-radius: ${token.borderRadiusLG}px;
    padding: ${token.paddingSM}px ${token.paddingMD}px;
  `,
  markdownContent: css`
    line-height: 1.6;
    width: 100%;
    overflow-wrap: break-word;
    
    p {
      margin: 0 0 ${token.marginXS}px 0;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    code {
      background: ${token.colorBgElevated};
      padding: 2px 4px;
      border-radius: 3px;
      font-family: ${token.fontFamilyCode};
      font-size: ${token.fontSizeSM}px;
    }
    
    pre {
      background: ${token.colorBgElevated};
      padding: ${token.paddingMD}px;
      border-radius: ${token.borderRadiusLG}px;
      overflow-x: auto;
      margin: ${token.marginSM}px 0;
      border: 1px solid ${token.colorBorderSecondary};
      
      code {
        background: none;
        padding: 0;
      }
    }
    
    ul, ol {
      padding-left: ${token.paddingLG}px;
      margin: ${token.marginSM}px 0;
    }
    
    blockquote {
      border-left: 4px solid ${token.colorBorder};
      padding-left: ${token.paddingMD}px;
      margin: ${token.marginSM}px 0;
      color: ${token.colorTextSecondary};
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: ${token.marginSM}px 0;
      
      th, td {
        border: 1px solid ${token.colorBorderSecondary};
        padding: 8px;
        text-align: left;
      }
      
      th {
        background-color: ${token.colorBgContainer};
      }
      
      tr:nth-child(even) {
        background-color: ${token.colorBgElevated};
      }
    }
  `,
  imageContent: css`
    margin-top: ${token.marginSM}px;
    display: flex;
    flex-wrap: wrap;
    gap: ${token.marginXS}px;
    
    img {
      max-width: 200px;
      max-height: 200px;
      border-radius: ${token.borderRadiusLG}px;
      object-fit: contain;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid ${token.colorBorderSecondary};
      transition: transform 0.3s;
      cursor: pointer;
      
      &:hover {
        transform: scale(1.02);
      }
    }
  `,
  roleTag: css`
    margin-right: 4px;
    border-radius: 4px;
    font-size: 12px;
    padding: 0 6px;
    height: 20px;
    line-height: 20px;
  `,
  typingIndicator: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    
    .dot {
      width: 4px;
      height: 4px;
      background-color: currentColor;
      border-radius: 50%;
      opacity: 0.6;
      animation: typingAnimation 1.4s infinite both;
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
    
    @keyframes typingAnimation {
      0%, 100% {
        opacity: 0.6;
        transform: translateY(0);
      }
      50% {
        opacity: 1;
        transform: translateY(-2px);
      }
    }
  `
}));

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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
}

interface ChatMessagesProps {
  messages: ChatMessageItem[];
  loading?: boolean;
  onRegenerateMessage?: (id: string) => void;
  onDeleteMessage?: (id: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading = false,
  onRegenerateMessage,
  onDeleteMessage,
}) => {
  const { styles } = useStyles();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onDeleteMessage?.(messageId);
      }
    });
  };

  const handleRegenerateMessage = (messageId: string) => {
    Modal.confirm({
      title: '重新生成',
      content: '重新生成将删除此消息及之后的所有消息，确定继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        onRegenerateMessage?.(messageId);
      }
    });
  };

  const getActionMenuItems = (message: ChatMessageItem): MenuProps['items'] => [
    {
      key: 'copy',
      label: '复制',
      icon: <CopyOutlined />,
      onClick: () => handleCopyMessage(message.content),
    },
    ...(message.role === 'assistant' ? [{
      key: 'regenerate',
      label: '重新生成',
      icon: <RedoOutlined />,
      onClick: () => handleRegenerateMessage(message.id),
    }] : []),
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteMessage(message.id),
    },
  ];

  // 格式化时间戳为可读时间
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (message: ChatMessageItem) => {
    if (message.status === 'loading') {
      return (
        <div className={styles.loadingMessage}>
          <Spin indicator={<LoadingOutlined spin />} size="small" />
          <Text>
            正在思考
            <span className={styles.typingIndicator}>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </Text>
        </div>
      );
    }

    if (message.status === 'error') {
      return (
        <div className={styles.errorMessage}>
          {message.content}
        </div>
      );
    }

    return (
      <>
        {/* 思考过程 */}
        {message.thinking && (
          <div className={styles.thinking}>
            <div className="thinking-header">
              <span>🤔</span>
              <span>思考过程</span>
            </div>
            <div className="thinking-content">{message.thinking}</div>
          </div>
        )}
        
        {/* 工具调用 */}
        {message.toolCalls && message.toolCalls.map((tool) => (
          <div key={tool.id} className={styles.toolCall}>
            <div className="tool-header">
              <span>🔧</span>
              <span>工具调用: {tool.functionName}</span>
            </div>
            <div className="tool-content">{tool.arguments}</div>
          </div>
        ))}
        
        {/* 消息内容 */}
        <div className={styles.markdownContent}>
          <Markdown 
            children={message.content}
          />
        </div>
        
        {/* 图片内容 */}
        {message.imageContents && message.imageContents.length > 0 && (
          <div className={styles.imageContent}>
            {message.imageContents.map((image, index) => (
              <img 
                key={index}
                src={`data:${image.mimeType};base64,${image.data}`}
                alt="图片内容"
                onClick={() => window.open(`data:${image.mimeType};base64,${image.data}`, '_blank')}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.messageList}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageItem} ${
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div className={styles.avatar}>
              <Avatar 
                size="large"
                icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                style={{ 
                  backgroundColor: message.role === 'user' ? '#1677ff' : '#f56a00',
                }}
              />
            </div>
            
            <div className={`${styles.messageContent} message-content`}>
              {renderMessageContent(message)}
              
              <div className={`${styles.messageActions} message-actions`}>
                <Dropdown menu={{ items: getActionMenuItems(message) }} trigger={['click']}>
                  <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
              </div>
            </div>
            
            <div className={`${styles.messageMeta} message-meta`}>
              {message.role === 'user' ? (
                <Tag className={styles.roleTag} color="blue">用户</Tag>
              ) : (
                <Tag className={styles.roleTag} color="orange">AI</Tag>
              )}
              <span>{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;