'use client'

import { ChatItem, ChatList } from "@lobehub/ui/chat";
import { useState, useEffect, useRef } from "react";
import { Flexbox } from "react-layout-kit";
import ChatInput from "../components/ChatInput";
import Message from "./message";
import { chatService } from "../services/chatService";
import { chatDB, ChatMessage, Conversation } from "../utils/indexedDB";
import { Modal, Button } from "antd";

interface WorkspaceProps {
    organizationName: string;
    name: string;
}

export interface MessageItem {
    id: string;
    content: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    extra?: {
        thinking?: string;
        toolCalls?: any[];
    };
    imageContents?: any[];
}

export default function Workspace({ organizationName, name }: WorkspaceProps) {
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [conversationId, setConversationId] = useState<string>('');
    const abortControllerRef = useRef<AbortController>(
        new AbortController()
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 初始化会话
    useEffect(() => {
        initializeConversation();
    }, [organizationName, name]);

    const initializeConversation = async () => {
        try {
            // 获取现有会话
            const conversations = await chatDB.getConversations(organizationName, name);
            
            if (conversations.length > 0) {
                // 使用最新的会话
                const latestConversation = conversations[0];
                setConversationId(latestConversation.id);
                
                // 加载该会话的历史消息
                await loadHistoryMessages(latestConversation.id);
            } else {
                // 创建新会话
                const newConversationId = uuidv4();
                const conversation: Conversation = {
                    id: newConversationId,
                    title: `${organizationName}/${name} 的对话`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    organizationName: organizationName,
                    repositoryName: name,
                };

                await chatDB.saveConversation(conversation);
                setConversationId(newConversationId);
            }
        } catch (error) {
            console.error('初始化会话失败:', error);
        }
    };

    const loadHistoryMessages = async (convId: string) => {
        try {
            const chatMessages = await chatDB.getMessages(convId);
            const messageItems: MessageItem[] = chatMessages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                createdAt: new Date(msg.timestamp),
                updatedAt: new Date(msg.timestamp),
                extra: msg.metadata ? {
                    thinking: msg.metadata.thinking,
                    toolCalls: msg.metadata.toolCalls,
                } : undefined,
                imageContents: msg.metadata?.imageContents,
            }));
            
            setMessages(messageItems);
        } catch (error) {
            console.error('加载历史消息失败:', error);
        }
    };

    const uuidv4 = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const handleSendMessage = async (message: string) => {

        const userMessage = {
            id: uuidv4(),
            content: message,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        messages.push(userMessage);

        const aiMessage: MessageItem = {
            id: uuidv4(),
            content: "",
            role: "assistant",
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        messages.push(aiMessage);

        setMessages([...messages]);

        // 保存用户消息到IndexedDB
        if (conversationId) {
            try {
                const userChatMessage: ChatMessage = {
                    id: userMessage.id,
                    type: 'message_content',
                    content: userMessage.content,
                    role: 'user',
                    timestamp: userMessage.createdAt.getTime(),
                    conversationId: conversationId,
                };
                await chatDB.saveMessage(userChatMessage);

                // 更新会话的最后消息
                await chatDB.updateConversation(conversationId, {
                    lastMessage: userMessage.content,
                    updatedAt: Date.now(),
                });
            } catch (error) {
                console.error('保存用户消息失败:', error);
            }
        }

        const requestData = {
            messages: messages.map(x => {
                return {
                    role: x.role as "user" | "assistant" | "system",
                    content: x.content,
                }
            }),
            organizationName: organizationName,
            name: name,
            abortController: abortControllerRef.current,
        }

        let aiResponseThinking = '';
        let aiResponseContent = '';
        let currentToolCalls: any[] = [];
        let isFirstContent = true;

        for await (const event of chatService.sendMessage(requestData)) {
            if (abortControllerRef.current?.signal.aborted) {
                break;
            }

            switch (event.type) {
                case 'reasoning_content':
                    // 思考内容流式更新
                    aiResponseThinking += event.content || '';

                    aiMessage.extra = {
                        thinking: aiResponseThinking,
                    }

                    setMessages([...messages]);

                    break;

                case 'tool_call':
                    // 工具调用
                    if (event.tool_call_id && event.function_name) {
                        // 新的工具调用开始
                        currentToolCalls.push({
                            id: event.tool_call_id,
                            functionName: event.function_name,
                            arguments: event.function_arguments || '',
                        });
                    } else if (currentToolCalls.length > 0) {
                        // 更新最后一个工具调用的参数
                        const lastToolCall = currentToolCalls[currentToolCalls.length - 1];
                        lastToolCall.arguments += event.function_arguments || '';
                    }

                    aiMessage.extra = {
                        toolCalls: currentToolCalls,
                    }

                    setMessages([...messages]);
                    break;

                case 'message_content':
                    // 消息内容流式更新
                    aiResponseContent += event.content || '';

                    aiMessage.content = aiResponseContent;

                    setMessages([...messages]);

                    // 标记已接收到第一次内容
                    isFirstContent = false;
                    break;

                case 'message_start':

                    break;

                case 'done':
                    setMessages([...messages]);

                    // 保存AI消息到IndexedDB
                    if (conversationId) {
                        try {
                            const aiChatMessage: ChatMessage = {
                                id: aiMessage.id,
                                type: 'message_content',
                                content: aiMessage.content,
                                role: 'assistant',
                                timestamp: aiMessage.createdAt.getTime(),
                                conversationId: conversationId,
                                metadata: {
                                    thinking: aiResponseThinking,
                                    toolCalls: currentToolCalls,
                                }
                            };
                            await chatDB.saveMessage(aiChatMessage);

                            // 更新会话的最后消息
                            await chatDB.updateConversation(conversationId, {
                                lastMessage: aiMessage.content.substring(0, 100) + (aiMessage.content.length > 100 ? '...' : ''),
                                updatedAt: Date.now(),
                            });
                        } catch (error) {
                            console.error('保存AI消息失败:', error);
                        }
                    }

                    break;
            }
        }
    }

    const handleStopGeneration = () => {
        abortControllerRef.current?.abort();
    }


    const handleDelete = (messageId: string) => {
        setMessages(messages.filter(x => x.id !== messageId));

        // 删除IndexedDB
        chatDB.deleteMessage(messageId);
    }

    const handleClear = () => {
        Modal.confirm({
            title: '确定要清空消息吗？',
            onOk: () => {
                setMessages([]);
                // 清空IndexedDB
                chatDB.clearMessages(conversationId);
            }
        });
    }

    return (
        <div className="workspace-container">
            <Flexbox gap={24} style={{ flex: 1, height: '100%' }}>
                <Flexbox 
                    className="messages-container"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        overflowX: 'hidden',
                        padding: '0 4px',
                    }}
                >
                    {
                        messages.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-state-content">
                                    <div className="empty-state-icon">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" fillOpacity="0.1"/>
                                            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="18" cy="6" r="2" fill="currentColor" fillOpacity="0.2"/>
                                            <circle cx="6" cy="18" r="2" fill="currentColor" fillOpacity="0.2"/>
                                        </svg>
                                    </div>
                                    <h3 className="empty-state-title">欢迎使用 AI 智能助手</h3>
                                    <p className="empty-state-description">
                                        OpenDeepWiki 基于先进的 AI 技术，为您的项目提供智能代码分析和问答服务。
                                        <br />
                                        开始对话，探索更多可能性！
                                    </p>
                                    <div className="empty-state-actions">
                                        <a 
                                            href="https://github.com/AIDotNet/OpenDeepWiki" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="learn-more-link"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 2C6.48 2 2 6.48 2 12C2 16.42 4.87 20.17 8.84 21.5C9.34 21.58 9.5 21.27 9.5 21C9.5 20.77 9.5 20.14 9.5 19.31C6.73 19.91 6.14 17.97 6.14 17.97C5.68 16.81 5.03 16.5 5.03 16.5C4.12 15.88 5.1 15.9 5.1 15.9C6.1 15.97 6.63 16.93 6.63 16.93C7.5 18.45 8.97 18 9.54 17.76C9.63 17.11 9.89 16.67 10.17 16.42C7.95 16.17 5.62 15.31 5.62 11.5C5.62 10.39 6 9.5 6.65 8.79C6.55 8.54 6.2 7.5 6.75 6.15C6.75 6.15 7.59 5.88 9.5 7.17C10.29 6.95 11.15 6.84 12 6.84C12.85 6.84 13.71 6.95 14.5 7.17C16.41 5.88 17.25 6.15 17.25 6.15C17.8 7.5 17.45 8.54 17.35 8.79C18 9.5 18.38 10.39 18.38 11.5C18.38 15.32 16.04 16.16 13.81 16.41C14.17 16.72 14.5 17.33 14.5 18.26C14.5 19.6 14.5 20.68 14.5 21C14.5 21.27 14.66 21.59 15.17 21.5C19.14 20.16 22 16.42 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
                                            </svg>
                                            了解更多
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {messages.map((message) => (
                        <Message
                            key={message.id}    
                            messageItem={message}
                            handleDelete={handleDelete}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </Flexbox>
                <div className="chat-input-container">
                    <ChatInput
                        onClear={handleClear}
                        onSend={handleSendMessage}
                        onStop={handleStopGeneration}
                    />
                </div>
            </Flexbox>
            
            <style jsx>{`
                .workspace-container {
                    height: 100%;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    display: flex;
                    flex-direction: column;
                }

                .messages-container {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    margin: 16px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                .messages-container::-webkit-scrollbar {
                    width: 8px;
                }

                .messages-container::-webkit-scrollbar-track {
                    background: rgba(241, 245, 249, 0.5);
                    border-radius: 8px;
                    margin: 8px 0;
                }

                .messages-container::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
                    border-radius: 8px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }

                .messages-container::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #94a3b8, #64748b);
                    background-clip: content-box;
                }

                .empty-state {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 400px;
                    padding: 48px 24px;
                }

                .empty-state-content {
                    text-align: center;
                    max-width: 480px;
                    padding: 48px 32px;
                }

                .empty-state-icon {
                    color: #3b82f6;
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: center;
                }

                .empty-state-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 16px 0;
                    letter-spacing: -0.025em;
                }

                .empty-state-description {
                    font-size: 16px;
                    color: #64748b;
                    line-height: 1.6;
                    margin: 0 0 32px 0;
                }

                .empty-state-actions {
                    display: flex;
                    justify-content: center;
                }

                .learn-more-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 500;
                    font-size: 14px;
                    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
                    transition: all 0.2s ease;
                }

                .learn-more-link:hover {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 12px -2px rgba(59, 130, 246, 0.4);
                    color: white;
                }

                .chat-input-container {
                    padding: 0 16px 16px 16px;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(226, 232, 240, 0.6);
                }
            `}</style>
        </div>
    )
}