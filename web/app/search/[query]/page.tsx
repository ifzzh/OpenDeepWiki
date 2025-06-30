'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { message as messageApi } from 'antd';
import { getChatShareMessageList } from '../../services/chatShareMessageServce';
import { API_URL, fetchSSE, getFileContent } from '../../services';
import { DocumentContent } from '../../components/document';
import styles from './search.module.css';
import RenderThinking from '../../components/document/Component';

// 定义消息类型
interface ChatMessage {
  content: string;
  think?: string;
  sender: 'user' | 'ai';
  loading?: boolean;
}

// 文件类型接口
interface ReferenceFile {
  path: string;
  title: string;
  content?: string;
}

export default function SearchPage() {
  const params = useParams();
  const chatShareMessageId = params.query as string;
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [showFileContent, setShowFileContent] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const [isInput, setIsInput] = useState(false);

  // 初始化页面时，如果有初始消息，自动发送
  useEffect(() => {
    if (chatShareMessageId) {
      loadInitMessage();
    }
  }, [chatShareMessageId]);

  // 页面加载完成后隐藏加载状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const loadInitMessage = async () => {
    const { data } = await getChatShareMessageList(chatShareMessageId, 1, 10);
    if (data.data.items.length === 0) {
      if (data.data.info && data.data.info.question) {
        messages.push({
          content: data.data.info.question,
          sender: 'user'
        })
        setWarehouseId(data.data.info.warehouseId)
        setMessages([...messages]);
      }

      if (data.data.info.userId) {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const userInfoObj = JSON.parse(userInfo);
          if (userInfoObj.id === data.data.info.userId) {
            setIsInput(true);
          }
        }
      } else {
        setIsInput(false);
      }
      handleSendMessage('', true);
    } else {
      // 循环处理消息列表
      const messageList = data.data.items.sort((a: any, b: any) => a.id - b.id);
      const newMessages: ChatMessage[] = [];

      messageList.forEach((item: any) => {
        newMessages.push({
          content: item.question || '',
          sender: 'user'
        });

        if (item.answer) {
          newMessages.push({
            content: item.answer,
            think: item.think,
            sender: 'ai'
          });
        }
      });

      // 获取最后一条消息的引用文件并渲染
      const lastMessage = messageList[messageList.length - 1];
      if (lastMessage && lastMessage.files && lastMessage.files.length > 0) {
        const files = lastMessage.files.map((x: string) => {
          const value = x.split('/');
          const title = value[value.length - 1];
          return {
            path: x,
            title,
          }
        });
        setReferenceFiles(files);
      }

      if (data.data.info && data.data.info.warehouseId) {
        setWarehouseId(data.data.info.warehouseId);
      }

      if (data.data.info.userId) {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const userInfoObj = JSON.parse(userInfo);
          if (userInfoObj.id === data.data.info.userId) {
            setIsInput(true);
          }
        }
      } else {
        setIsInput(false);
      }
      setMessages(newMessages);
    }
  }

  // 处理发送事件和SSE流
  const processSendEvent = async (
    chatShareMessageId: string,
    question: string,
    aiMessage: ChatMessage
  ) => {
    let aiResponseContent = '';
    let aiResponseThink = '';
    let isFirstContent = true; // 标记是否是第一次接收内容

    const stream = fetchSSE(API_URL + '/api/Chat/Completions', {
      chatShareMessageId,
      question,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'message') {
        // 第一次收到内容时清空占位文本
        if (isFirstContent) {
          aiMessage.content = '';
          isFirstContent = false;
        }
        
        aiResponseContent += chunk?.content ?? '';
        aiMessage.content = aiResponseContent;
        aiMessage.loading = false;
        setMessages([...messages]);
      }
      else if (chunk.type === 'reasoning') {
        aiResponseThink += chunk.content;
        aiMessage.loading = false;
        aiMessage.think = aiResponseThink;
        setMessages([...messages]);
      } else if (chunk.type === 'tool') {
        const files = chunk.content.map((x: string) => {
          const value = x.split('/');
          const title = value[value.length - 1];
          return {
            path: x,
            title,
          }
        });
        referenceFiles.push(...files);
        setReferenceFiles([...referenceFiles]);
      }
    }

    return { aiResponseContent, aiResponseThink };
  };

  // 发送消息的处理函数
  const handleSendMessage = async (content: string = message, init: boolean = false) => {
    if (!content.trim() && init == false) return;

    // 添加打字动画效果
    if (!init) {
      messages.push({
        content,
        sender: 'user'
      });
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 300);

      setMessages([...messages]);
      setMessage('');
    }

    if (loading) {
      return;
    }

    const aiMessage: ChatMessage = {
      content: '正在思考中...',
      sender: 'ai' as const,
      loading: true
    };

    messages.push(aiMessage);
    setMessages([...messages]);
    setLoading(true);
    setFileListLoading(true);

    try {
      // 使用新的事件处理函数
      await processSendEvent(chatShareMessageId, content, aiMessage);
    } catch (error) {
      messageApi.error('获取回复时发生错误');
    } finally {
      setLoading(false);
      setFileListLoading(false);
    }
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 根据文件扩展名获取对应的图标
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'md': '📝', 'markdown': '📝',
      'js': '🟨', 'ts': '🔷', 'tsx': '⚛️', 'jsx': '⚛️',
      'py': '🐍', 'java': '☕', 'go': '🐹',
      'json': '📋', 'xml': '📄', 'yaml': '⚙️', 'yml': '⚙️',
      'css': '🎨', 'scss': '🎨', 'less': '🎨',
      'html': '🌐', 'htm': '🌐',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'pdf': '📕', 'doc': '📘', 'docx': '📘', 'txt': '📄'
    };
    return iconMap[extension || ''] || '📄';
  };

  // 文件点击处理
  const handleFileClick = async (path: string) => {
    setSelectedFile(path);
    setShowFileContent(true);
    setFileContentLoading(true);

    try {
      const { data } = await getFileContent(warehouseId, path);
      setFileContent(data.data);
    } catch (error) {
      messageApi.error('获取文件内容失败');
    } finally {
      setFileContentLoading(false);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    messageApi.success('已复制到剪贴板');
  };

  // 页面加载状态
  if (pageLoading) {
    return (
      <div className={styles.pageLoader}>
        <div className={styles.loaderContent}>
          <div className={styles.loaderIcon}>🧠</div>
          <div className={styles.loaderText}>OpenDeepWiki</div>
          <div className={styles.loaderSubtext}>正在加载智能对话...</div>
          <div className={styles.loaderSpinner}>
            <div className={styles.spinnerRing}></div>
            <div className={styles.spinnerRing}></div>
            <div className={styles.spinnerRing}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ colorScheme: 'light' }}>
      {/* 主聊天区域 */}
      <div className={styles.chatSection}>
        {/* 头部 */}
        <div className={styles.header}>
          <a href="/" className={styles.logo}>
            <span className={styles.logoIcon}>🧠</span>
            <span className={styles.logoText}>OpenDeepWiki</span>
          </a>
        </div>

        {/* 消息区域 */}
        <div className={styles.messagesContainer} ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <div className={styles.emptyText}>开始一个新的对话</div>
              <div className={styles.emptySubtext}>我可以帮助您分析文档和回答问题</div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.messageWrapper} ${msg.sender === 'user' ? styles.userMessage : styles.aiMessage
                  }`}
              >
                <div className={styles.messageContent}>
                  {msg.loading ? (
                    <div className={styles.loadingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : msg.sender === 'user' ? (
                    <div className={`${styles.userText} ${isTyping && index === messages.length - 1 ? styles.typing : ''}`}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className={styles.aiText}>
                      {msg.think && (
                        <RenderThinking think={msg.think}>
                          {msg.think}
                        </RenderThinking>
                      )}
                      <DocumentContent
                        document={{ content: msg.content }}
                        owner=''
                        name=''
                        token={{
                          colorBgContainer: 'transparent',
                          colorText: '#334155',
                          colorTextHeading: '#1e293b',
                          colorPrimary: '#3b82f6',
                          colorPrimaryHover: '#2563eb',
                          colorPrimaryBorder: '#3b82f6',
                          colorBorderSecondary: '#e2e8f0',
                          colorFillSecondary: '#f1f5f9',
                          colorFillQuaternary: '#f8fafc'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {isInput && 
        <div className={styles.inputSection}>
          <div className={styles.inputContainer}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="输入您的问题..."
              className={styles.messageInput}
              disabled={loading}
              rows={1}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !message.trim()}
              className={`${styles.sendButton} ${loading ? styles.sending : ''}`}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>}
      </div>

      {/* 文件侧边栏 */}
      <div className={styles.sidebar}>
        {showFileContent && selectedFile ? (
          // 文件内容视图
          <div className={styles.fileContentView}>
            <div className={styles.fileHeader}>
              <button
                onClick={() => setShowFileContent(false)}
                className={styles.backButton}
              >
                ← 返回
              </button>
              <div className={styles.fileName}>
                {selectedFile.split('/').pop()}
              </div>
              <button
                onClick={() => copyToClipboard(selectedFile)}
                className={styles.copyButton}
              >
                📋
              </button>
            </div>
            <div className={styles.fileContentContainer}>
              {fileContentLoading ? (
                <div className={styles.fileLoading}>
                  <div className={styles.loadingSpinner}></div>
                  <div>加载中...</div>
                </div>
              ) : (
                <pre className={styles.fileContent}>
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>
          </div>
        ) : (
          // 文件列表视图
          <div className={styles.fileListView}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitle}>
                <span className={styles.sidebarIcon}>📁</span>
                引用文件
              </div>
              {fileListLoading && (
                <div className={styles.loadingSpinner}></div>
              )}
            </div>
            <div className={styles.fileList}>
              {fileListLoading ? (
                // 骨架屏
                Array(3).fill(null).map((_, index) => (
                  <div key={index} className={styles.fileSkeleton}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonContent}>
                      <div className={styles.skeletonTitle}></div>
                      <div className={styles.skeletonPath}></div>
                    </div>
                  </div>
                ))
              ) : referenceFiles.length > 0 ? (
                referenceFiles.map((file, index) => (
                  <div
                    key={index}
                    className={styles.fileItem}
                    onClick={() => handleFileClick(file.path)}
                  >
                    <div className={styles.fileIcon}>
                      {getFileIcon(file.title)}
                    </div>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileTitle}>{file.title}</div>
                      <div className={styles.filePath}>{file.path}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyFiles}>
                  <div className={styles.emptyFilesIcon}>📂</div>
                  <div className={styles.emptyFilesText}>暂无引用文件</div>
                  <div className={styles.emptyFilesSubtext}>
                    系统会在回答过程中自动识别相关文件
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
