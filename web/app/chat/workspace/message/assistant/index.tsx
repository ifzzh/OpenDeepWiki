import { ChatItem } from "@lobehub/ui/chat";
import { MessageItem } from "../..";
import { Button, message, Modal, Spin, Tag, Tooltip } from "antd";
import { Collapse, Markdown } from "@lobehub/ui";
import { Copy, MoreHorizontal, Trash2, FileText, Brain, Settings } from "lucide-react";
import { Flexbox } from "react-layout-kit";

interface AssistantMessageProps {
    messageItem: MessageItem;
    handleDelete: (messageId: string) => void;
}

export default function AssistantMessage({ messageItem, handleDelete }: AssistantMessageProps) {

    const renderToolCalls = (toolCall: any) => {
        console.log(toolCall);

        const renderArguments = (type: string) => {
            try {
                const parsedArgs = JSON.parse(toolCall.arguments);
                if (type === 'fileFromLine') {
                    if (parsedArgs.items) {
                        return (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                padding: '8px 0',
                            }}>
                                {parsedArgs.items.map((item: any, index: number) => (
                                    <div key={index} style={{
                                        padding: '8px 12px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 6,
                                        border: '1px solid #e9ecef',
                                        fontSize: '13px',
                                    }}>
                                        <div style={{
                                            color: '#495057',
                                            fontWeight: 500,
                                            marginBottom: 4
                                        }}>
                                            📄 {item.FilePath}
                                        </div>
                                        <div style={{
                                            color: '#6c757d',
                                            fontSize: '12px'
                                        }}>
                                            第 {item.StartLine} - {item.EndLine} 行
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }
                } else if (type === 'fileInfo') {
                    if (parsedArgs.filePath && Array.isArray(parsedArgs.filePath)) {
                        return (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                padding: '8px 0',
                            }}>
                                {parsedArgs.filePath.map((path: string, index: number) => (
                                    <Tag key={index} color="blue" style={{
                                        fontSize: '12px',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                    }}>
                                        📁 {path}
                                    </Tag>
                                ))}
                            </div>
                        );
                    }
                } else {
                    return (
                        <pre style={{
                            backgroundColor: '#f8f9fa',
                            padding: '12px',
                            borderRadius: 6,
                            fontSize: '12px',
                            color: '#495057',
                            overflow: 'auto',
                            border: '1px solid #e9ecef',
                        }}>
                            {toolCall.arguments}
                        </pre>
                    );
                }
            } catch (error) {
                return (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}>
                        <Spin size="small" />
                        <span style={{ marginLeft: 8, color: '#6c757d' }}>处理中...</span>
                    </div>
                );
            }
        };

        const getToolInfo = (functionName: string) => {
            if (functionName === 'FileFunction-FileFromLine') {
                return { icon: <FileText size={14} />, label: '📖 读取文件内容', color: '#52c41a' };
            } else if (functionName === 'FileFunction-FileInfo') {
                return { icon: <FileText size={14} />, label: '📁 获取文件信息', color: '#1890ff' };
            } else {
                return { icon: <Settings size={14} />, label: functionName, color: '#722ed1' };
            }
        };

        const toolInfo = getToolInfo(toolCall.functionName);

        return (
            <div style={{
                marginBottom: 12,
                borderRadius: 8,
                border: '1px solid #e6f4ff',
                backgroundColor: '#f6ffed',
                overflow: 'hidden',
            }}>
                <Collapse
                    size="small"
                    items={[
                        {
                            key: toolCall.functionName,
                            label: (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color: toolInfo.color,
                                    fontWeight: 500,
                                }}>
                                    {toolInfo.icon}
                                    {toolInfo.label}
                                </div>
                            ),
                            children: renderArguments(
                                toolCall.functionName === 'FileFunction-FileFromLine' ? 'fileFromLine' :
                                    toolCall.functionName === 'FileFunction-FileInfo' ? 'fileInfo' : 'other'
                            ),
                        }
                    ]}
                />
            </div>
        );
    }

    const renderMessage = () => {
        return (
            <Flexbox gap={16}>
                {/* 工具调用区域 */}
                {messageItem.extra?.toolCalls && messageItem.extra.toolCalls.length > 0 && (
                    <div style={{
                        backgroundColor: '#fafafa',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 12,
                            color: '#595959',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}>
                            <Settings size={14} />
                            工具调用 ({messageItem.extra.toolCalls.length})
                        </div>
                        {messageItem.extra.toolCalls.map((toolCall, index) => (
                            <div key={index}>
                                {renderToolCalls(toolCall)}
                            </div>
                        ))}
                    </div>
                )}

                {/* 思考过程区域 */}
                {messageItem.extra?.thinking && (
                    <div style={{
                        backgroundColor: '#fff7e6',
                        borderRadius: 8,
                        border: '1px solid #ffd591',
                        overflow: 'hidden',
                    }}>
                        <Collapse
                            defaultActiveKey={["thinking"]}
                            items={[
                                {
                                    key: "thinking",
                                    label: (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            color: '#d46b08',
                                            fontWeight: 500,
                                        }}>
                                            推理内容
                                        </div>
                                    ),
                                    children: (
                                        <div style={{
                                            maxHeight: 300,
                                            overflowY: 'auto',
                                            padding: '0 12px 12px',
                                        }}>
                                            <Markdown
                                                fontSize={12}
                                                children={messageItem.extra.thinking}
                                                enableMermaid
                                                enableImageGallery
                                                enableLatex
                                                enableCustomFootnotes
                                            />
                                        </div>
                                    ),
                                }
                            ]}
                        />
                    </div>
                )}

                {/* 主要回复内容 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    padding: messageItem.content ? '16px' : '24px',
                    border: '1px solid #f0f0f0',
                    minHeight: messageItem.content ? 'auto' : '60px',
                    display: 'flex',
                    alignItems: messageItem.content ? 'flex-start' : 'center',
                    justifyContent: messageItem.content ? 'flex-start' : 'center',
                }}>
                    {messageItem.content === '' ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            color: '#8c8c8c',
                        }}>
                            <Spin size="small" />
                        </div>
                    ) : (
                        <Markdown
                            fontSize={12}
                            children={messageItem.content}
                            enableMermaid
                            enableImageGallery
                            enableCustomFootnotes
                            enableLatex
                        />
                    )}
                </div>
            </Flexbox>
        )
    }

    const handleDeleteClick = () => {
        Modal.confirm({
            title: '确定删除该消息吗？',
            content: '删除后将无法恢复',
            okText: '确定删除',
            cancelText: '取消',
            okType: 'danger',
            onOk: () => {
                handleDelete(messageItem.id);
            }
        });
    }

    const handleCopyClick = () => {
        const content = messageItem.content;
        navigator.clipboard.writeText(content);
        message.success('已复制到剪贴板');
    }

    const renderActions = () => {
        return (
            <Flexbox
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                }}
            >
                <Tooltip title="复制回复内容">
                    <Button
                        size="small"
                        type="text"
                        onClick={handleCopyClick}
                        style={{
                            color: '#8c8c8c',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#1890ff';
                            e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#8c8c8c';
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <Copy size={14} />
                    </Button>
                </Tooltip>
                <Tooltip title="删除消息">
                    <Button
                        size="small"
                        type="text"
                        onClick={handleDeleteClick}
                        style={{
                            color: '#8c8c8c',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ff4d4f';
                            e.currentTarget.style.backgroundColor = '#fff2f0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#8c8c8c';
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <Trash2 size={14} />
                    </Button>
                </Tooltip>
            </Flexbox>
        )
    }

    return (
        <ChatItem
            avatar={{
                avatar: "🤖",
                title: "AI助手",
            }}
            actions={renderActions()}
            renderMessage={renderMessage}
            key={messageItem.id}
            message={messageItem.content}
            style={{
                marginBottom: 16,
            }}
        />
    )
}