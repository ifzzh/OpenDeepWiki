'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Layout, Row, Col, Button, Typography, theme, Spin, Empty, List, message as messageApi, Tooltip, ConfigProvider, Skeleton, Card, Divider } from 'antd';
import { FileTextOutlined, GithubFilled, CopyOutlined, FileOutlined, FileMarkdownOutlined, FileImageOutlined, FileExcelOutlined, FileWordOutlined, FilePdfOutlined, FileUnknownOutlined, CodeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getChatShareMessageList } from '../../services/chatShareMessageServce';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { homepage } from '../../const/urlconst';
import { API_URL, fetchSSE, getFileContent } from '../../services';
import { DocumentContent } from '../../components/document';

const { Text, Title } = Typography;
const { useToken } = theme;

// 定义消息类型
interface ChatMessage {
  content: string;
  sender: 'user' | 'ai';
  loading?: boolean;
}

export default function SearchPage({ }: any) {
  const { token } = useToken();
  const params = useParams();
  const chatShareMessageId = params.query as string;
  // 添加消息容器引用
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState('')

  // 模拟引用文件列表
  const [referenceFiles, setReferenceFiles] = useState<Array<{
    path: string;
    title: string;
    content?: string;
  }>>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileContentLoading, setFileContentLoading] = useState(false);
  const [showFileContent, setShowFileContent] = useState(false);

  // 初始化页面时，如果有初始消息，自动发送
  useEffect(() => {
    if (chatShareMessageId) {
      loadInitMessage();
    }
  }, [chatShareMessageId]);

  const loadInitMessage = async () => {
    const { data } = await getChatShareMessageList(chatShareMessageId, 1, 10);
    console.log(data.data.items);

    if (data.data.items.length === 0) {
      if (data.data.info && data.data.info.question) {
        messages.push({
          content: data.data.info.question,
          sender: 'user'
        })
        setWarehouseId(data.data.info.warehouseId)
        setMessages([...messages]);
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

      setMessages(newMessages);
    }
  }

  // 渲染消息气泡
  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.sender === 'user';

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: token.marginMD,
        }}
      >
        <div
          style={{
            maxWidth: '85%',
            padding: `${token.paddingMD}px ${token.paddingLG}px`,
            borderRadius: token.borderRadiusLG,
            backgroundColor: isUser ? token.colorPrimaryBg : token.colorBgContainer,
            color: token.colorText,
            boxShadow: `0 1px 2px rgba(0, 0, 0, 0.03)`,
          }}
        >
          {msg.loading ? (
            <Spin size="small" />
          ) : (
            isUser ? (
              <Text style={{ fontSize: token.fontSizeSM }}>
                {msg.content}
              </Text>
            ) : (
              <div className="markdown-content">
                <DocumentContent
                  document={{ content: msg.content }}
                  owner=''
                  name=''
                  token={token}
                />
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  // 发送消息的处理函数
  const handleSendMessage = async (content: string = message, init: boolean = false) => {
    if (!content.trim() && init == false) return;
    if (!init) {
      // 使用函数式更新确保获取最新状态
      setMessages(prevMessages => [
        ...prevMessages,
        {
          content,
          sender: 'user'
        }
      ]);
      // 清空输入框
      setMessage('');
    }

    if (loading) {
      return;
    }

    // 创建AI消息对象
    const aiMessage = {
      content: '',
      sender: 'ai' as const,
      loading: true
    };

    // 添加AI消息到消息列表
    setMessages(prevMessages => [...prevMessages, aiMessage]);
    setLoading(true);
    setFileListLoading(true); // 开始文件列表加载

    let aiResponseContent = '';

    try {
      const stream = fetchSSE(API_URL + '/api/Chat/Completions', {
        chatShareMessageId,
        question: content,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'message') {
          aiResponseContent += chunk?.content ?? '';
          // 使用函数式更新获取最新状态，创建新的消息数组
          setMessages(prevMessages => {
            // 创建新的消息数组
            const newMessages = [...prevMessages];
            // 更新最后一条AI消息
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.sender === 'ai') {
              newMessages[newMessages.length - 1] = {
                ...lastMessage,
                content: aiResponseContent,
                loading: false
              };
            }
            return newMessages;
          });
        } else if (chunk.type === 'tool') {
          const files = chunk.content.map((x: string) => {
            const value = x.split('/');
            const title = value[value.length - 1];
            return {
              path: x,
              title,
            }
          });
          setReferenceFiles([...files]);
        }
      }
    } catch (error) {
      console.error('流式响应出错:', error);
      messageApi.error('获取回复时发生错误');
    } finally {
      setLoading(false);
      setFileListLoading(false); // 结束文件列表加载
    }
  };

  // 添加自动滚动到底部的函数
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 根据文件扩展名获取对应的图标
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'md':
      case 'markdown':
        return <FileMarkdownOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <FileImageOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileExcelOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'doc':
      case 'docx':
        return <FileWordOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'json':
        return <CodeOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'java':
      case 'c':
      case 'cpp':
      case 'cs':
      case 'go':
      case 'rb':
      case 'php':
      case 'html':
      case 'css':
      case 'scss':
      case 'less':
        return <FileOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
      default:
        return <FileUnknownOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />;
    }
  };

  // 根据文件扩展名获取对应的语言名称
  const getLanguageFromExtension = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'tsx';
      case 'jsx': return 'jsx';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      case 'cs': return 'csharp';
      case 'go': return 'go';
      case 'rb': return 'ruby';
      case 'php': return 'php';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'less': return 'less';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'text';
    }
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

  // 渲染文件骨架屏
  const renderFileSkeleton = () => {
    return Array(3).fill(null).map((_, index) => (
      <div key={index} style={{ padding: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Skeleton 
          active 
          avatar={{ shape: 'square', size: 'default' }} 
          paragraph={{ rows: 1, width: ['80%'] }} 
          title={{ width: '40%' }}
        />
      </div>
    ));
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgLayout: '#f0f2f5',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorPrimaryBg: 'rgba(22, 119, 255, 0.08)',
          colorBorderSecondary: '#f0f0f0',
          borderRadius: 8,
        },
        components: {
          Card: {
            colorBorderSecondary: 'transparent',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
        <Row gutter={16} style={{ height: '100vh', padding: '16px' }}>
          {/* 聊天区域 */}
          <Col xs={24} sm={24} md={14} lg={16} xl={16} style={{ height: '100%' }}>
            <Card 
              bodyStyle={{ 
                padding: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column' 
              }}
              style={{ height: '100%', borderRadius: '12px' }}
              bordered={false}
            >
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                backgroundColor: token.colorBgContainer,
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
              }}>
                <a href="/" style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: token.fontSizeLG,
                  fontWeight: 600,
                  color: token.colorPrimary,
                  textDecoration: 'none',
                }}>
                  <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>OpenDeepWiki</Title>
                </a>
              </div>

              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  backgroundColor: token.colorBgContainer,
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                }}
              >
                {messages.length === 0 ? (
                  <Empty
                    description={<Text type="secondary">开始一个新的对话</Text>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginTop: '20%' }}
                  />
                ) : (
                  messages.map((msg, index) => renderMessage(msg, index))
                )}
              </div>
            </Card>
          </Col>

          {/* 文件资源区域 */}
          <Col xs={24} sm={24} md={10} lg={8} xl={8} style={{ height: '100%' }}>
            <Card 
              bodyStyle={{ 
                padding: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column' 
              }}
              style={{ height: '100%', borderRadius: '12px' }}
              bordered={false}
            >
              {showFileContent && selectedFile ? (
                // 文件内容视图
                <div style={{ 
                  height: '100%', 
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    padding: '16px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => setShowFileContent(false)}
                        style={{ marginRight: '8px' }}
                      />
                      <Text strong>{selectedFile.split('/').pop()}</Text>
                    </div>
                    <Tooltip title="复制路径">
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(selectedFile);
                          messageApi.success('路径已复制');
                        }}
                      />
                    </Tooltip>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                    {fileContentLoading ? (
                      <div style={{ padding: '16px' }}>
                        <Skeleton active paragraph={{ rows: 10 }} />
                      </div>
                    ) : (
                      <SyntaxHighlighter
                        language={getLanguageFromExtension(selectedFile.split('/').pop() || '')}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: '16px',
                          fontSize: token.fontSizeSM,
                          backgroundColor: 'transparent',
                          border: 'none',
                          height: '100%',
                          overflow: 'auto',
                        }}
                      >
                        {fileContent}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              ) : (
                // 文件列表视图
                <>
                  <div style={{
                    padding: '16px 24px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FileTextOutlined style={{ marginRight: '8px', color: token.colorPrimary }} />
                      <Text strong>引用文件</Text>
                    </div>
                    {fileListLoading && <Spin size="small" />}
                  </div>

                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    backgroundColor: token.colorBgContainer,
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px',
                  }}>
                    {fileListLoading ? (
                      // 骨架屏加载
                      renderFileSkeleton()
                    ) : referenceFiles.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={referenceFiles}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: `1px solid ${token.colorBorderSecondary}`,
                              transition: 'all 0.2s',
                            }}
                            onClick={() => handleFileClick(item.path)}
                            className="file-item-hover"
                          >
                            <List.Item.Meta
                              avatar={
                                <div style={{
                                  width: 40,
                                  height: 40,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: token.colorPrimaryBg,
                                  borderRadius: '8px'
                                }}>
                                  {getFileIcon(item.title)}
                                </div>
                              }
                              title={<Text strong>{item.title}</Text>}
                              description={
                                <Text
                                  type="secondary"
                                  ellipsis={{ tooltip: item.path }}
                                  style={{ fontSize: token.fontSizeSM }}
                                >
                                  {item.path}
                                </Text>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '4px' 
                          }}>
                            <Text type="secondary">暂无引用文件</Text>
                            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                              系统会在回答过程中自动识别相关文件
                            </Text>
                          </div>
                        }
                        style={{
                          margin: 0,
                          padding: '48px 24px',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Layout>

      <style jsx global>{`
        .file-item-hover:hover {
          background-color: ${token.colorPrimaryBg};
        }
      `}</style>
    </ConfigProvider>
  );
} 