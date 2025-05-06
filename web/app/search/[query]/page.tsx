'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Layout, Row, Col, Card, Input, Button, Typography, Space, theme, Spin, Empty, Avatar, Divider, List, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, DatabaseOutlined, FileTextOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;
const { TextArea } = Input;

// SSE 辅助函数
export async function* fetchSSE(url: string, data: any): AsyncIterableIterator<any> {
  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await window.fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const json = JSON.parse(errorText);
      if (!json.success) {
        message.error(json.message, 5);
      }
      throw new Error(json.message || 'API请求失败');
    } catch {
      throw new Error(errorText || '网络请求失败');
    }
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = chunk.split("\n\n");

      for (const event of events) {
        if (event.trim()) {
          const dataLine = event.split("\n").find(line => line.startsWith("data:"));
          if (dataLine) {
            const jsonData = dataLine.replace("data:", "").trim();
            if (jsonData === "[done]") {
              break;
            }
            yield JSON.parse(jsonData);
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
}

// API服务封装
const chatService = {
  async sendMessage(chatShareMessageId: string, content: string, onChunk: (chunk: any) => void, onDone: () => void) {
    const data = {
      chatShareMessageId,
      question: content,
      // 可根据实际API添加其他参数
    };

    try {
      const stream = fetchSSE('/api/Chat/Completions', data);
      for await (const chunk of stream) {
        onChunk(chunk);
      }
      onDone();
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请稍后重试', 3);
      onDone();
    }
  }
};

// 定义消息类型
interface ChatMessage {
  content: string;
  sender: 'user' | 'ai';
  loading?: boolean;
}

export default function SearchPage() {
  const { token } = useToken();
  const params = useParams();
  const searchParams = useSearchParams();

  // 获取 chatShareMessageId（从路径参数）和消息内容（从查询参数）
  const chatShareMessageId = params.query as string;
  const initialMessage = searchParams.get('message') || '';

  const [message, setMessage] = useState(initialMessage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // 模拟引用文件列表
  const [referenceFiles, setReferenceFiles] = useState([
    { title: 'chatActions.ts', path: '/src/services/chat/actions.ts' },
    { title: 'chatStatus.css', path: '/src/styles/chat/status.css' },
    { title: 'tasks.ts', path: '/src/services/tasks/index.ts' },
    { title: 'chatContribution.ts', path: '/src/components/chat/contribution.ts' },
    { title: 'chatAgents.ts', path: '/src/services/agents/index.ts' },
  ]);

  // 初始化页面时，如果有初始消息，自动发送
  useEffect(() => {
    if (initialMessage) {
      handleSendMessage(initialMessage);
    }
  }, []);

  // 发送消息的处理函数
  const handleSendMessage = (content: string = message) => {
    if (!content.trim()) return;

    // 添加用户消息到消息列表
    setMessages(prev => [...prev, { content, sender: 'user' }]);

    // 清空输入框
    setMessage('');

    // 添加AI正在响应的占位消息
    const aiMessageId = Date.now().toString();
    setMessages(prev => [...prev, { content: '', sender: 'ai', loading: true }]);
    setLoading(true);

    // 调用实际API
    let aiResponseContent = '';

    chatService.sendMessage(
      chatShareMessageId,
      content,
      (chunk) => {
        // 处理每个响应片段
        console.log(chunk);
        if (chunk.message) {
          if (chunk.type === 'message') {
            aiResponseContent += chunk.content;

            // 更新AI响应内容
            setMessages(prev => {
              const newMessages = [...prev];
              const loadingMsgIndex = newMessages.findIndex(msg => msg.loading);
              if (loadingMsgIndex !== -1) {
                newMessages[loadingMsgIndex] = {
                  ...newMessages[loadingMsgIndex],
                  content: aiResponseContent,
                };
              }
              return newMessages;
            });

            // 更新引用文件列表（如果API返回）
            if (chunk.references && Array.isArray(chunk.references)) {
              setReferenceFiles(chunk.references.map(ref => ({
                title: ref.fileName || ref.title,
                path: ref.filePath || ref.path
              })));
            }
          }
        }
      },
      () => {
        // 处理完成
        setMessages(prev => {
          const newMessages = [...prev];
          const loadingMsgIndex = newMessages.findIndex(msg => msg.loading);
          if (loadingMsgIndex !== -1) {
            newMessages[loadingMsgIndex] = {
              content: aiResponseContent || '无法获取响应，请重试',
              sender: 'ai',
              loading: false
            };
          }
          return newMessages;
        });
        setLoading(false);
      }
    );
  };

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
        {!isUser && (
          <Avatar
            icon={<RobotOutlined />}
            size={isUser ? "large" : "default"}
            style={{
              backgroundColor: token.colorPrimary,
              marginRight: token.marginXS
            }}
          />
        )}

        <div
          style={{
            maxWidth: '80%',
            padding: isUser ? token.paddingMD : token.paddingSM,
            borderRadius: token.borderRadiusLG,
            backgroundColor: isUser ? token.colorPrimary : token.colorBgElevated,
            color: isUser ? token.colorTextLightSolid : token.colorText,
            fontSize: isUser ? token.fontSizeLG : token.fontSize,
          }}
        >
          {msg.loading ? (
            <Spin size="small" />
          ) : (
            <Text style={{
              color: isUser ? token.colorTextLightSolid : token.colorText,
              fontSize: isUser ? token.fontSizeLG : token.fontSize,
            }}>
              {msg.content}
            </Text>
          )}
        </div>

        {isUser && (
          <Avatar
            icon={<UserOutlined />}
            size="large"
            style={{
              backgroundColor: token.colorPrimaryBg,
              marginLeft: token.marginXS
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
      <Content style={{ padding: token.paddingLG }}>
        <Row gutter={[16, 16]}>
          {/* 左侧聊天区域 */}
          <Col xs={24} sm={24} md={16} lg={18} xl={18}>
            <div style={{
              height: 'calc(100vh - 40px)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* 标题区域 */}
              <div style={{
                padding: `${token.paddingSM}px ${token.paddingMD}px`,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                backgroundColor: token.colorBgContainer,
                display: 'flex',
                alignItems: 'center',
                borderTopLeftRadius: token.borderRadiusLG,
                borderTopRightRadius: token.borderRadiusLG,
              }}>
                <DatabaseOutlined style={{ marginRight: token.marginXS, color: token.colorPrimary }} />
              </div>

              {/* 消息列表区域 */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: token.paddingMD,
                backgroundColor: token.colorBgContainer,
              }}>
                {messages.length === 0 ? (
                  <Empty
                    description="开始一个新的对话"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  messages.map((msg, index) => renderMessage(msg, index))
                )}
              </div>

              {/* 底部输入区域 */}
              <div
                style={{
                  padding: token.paddingSM,
                  backgroundColor: token.colorBgElevated,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  borderBottomLeftRadius: token.borderRadiusLG,
                  borderBottomRightRadius: token.borderRadiusLG,
                }}
              >
                <div style={{ display: 'flex', gap: token.marginXS }}>
                  <TextArea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="输入您的问题..."
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    style={{ flex: 1 }}
                    disabled={loading}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleSendMessage()}
                    loading={loading}
                    disabled={!message.trim()}
                    style={{ height: 'auto' }}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </div>
          </Col>

          {/* 右侧引用文件列表 */}
          <Col xs={24} sm={24} md={8} lg={6} xl={6}>
            <div style={{
              height: 'calc(100vh - 40px)',
              backgroundColor: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
            }}>
              {/* 标题区域 */}
              <div style={{
                padding: `${token.paddingSM}px ${token.paddingMD}px`,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                alignItems: 'center',
              }}>
                <FileTextOutlined style={{ marginRight: token.marginXS, color: token.colorPrimary }} />
                <Text strong>引用文件</Text>
              </div>

              {/* 文件列表 */}
              <List
                itemLayout="horizontal"
                dataSource={referenceFiles}
                renderItem={(item) => (
                  <List.Item style={{ padding: `${token.paddingSM}px ${token.paddingMD}px` }}>
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} />}
                      title={<Text strong>{item.title}</Text>}
                      description={<Text type="secondary" ellipsis>{item.path}</Text>}
                    />
                  </List.Item>
                )}
                style={{
                  height: 'calc(100% - 45px)',
                  overflowY: 'auto',
                }}
              />
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
} 