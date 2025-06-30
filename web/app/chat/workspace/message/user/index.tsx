import { ChatItem } from "@lobehub/ui/chat";
import { MessageItem } from "../..";
import { Button, message, Modal } from "antd";
import { Copy, Trash2 } from "lucide-react";
import { Flexbox } from "react-layout-kit";
import { Markdown } from "@lobehub/ui";

interface UserMessageProps {
    messageItem: MessageItem;
    handleDelete: (messageId: string) => void;
}

export default function UserMessage({ messageItem, handleDelete }: UserMessageProps) {
    const handleDeleteClick = () => {
        Modal.confirm({
            title: '确定删除该消息吗？',
            onOk: () => {
                handleDelete(messageItem.id);
            }
        });
    }

    const handleCopyClick = () => {
        navigator.clipboard.writeText(messageItem.content);
        message.success('已复制到剪贴板');
    }

    const renderActions = () => {
        return (
            <Flexbox
                gap={8}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Button
                    type="text"
                    onClick={handleDeleteClick}
                    size="small"
                >
                    <Trash2
                        color="red"
                        size={16}
                    />
                </Button>
                <Button
                    type="text"
                    onClick={handleCopyClick}
                    size="small"
                >
                    <Copy
                        size={16}
                    />
                </Button>
            </Flexbox>
        )
    }

    const renderMessage = () => {
        return (
            <Markdown
                style={{
                    maxHeight: 230,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    fontSize: 12,
                }}
            >{messageItem.content}</Markdown>
        )
    }

    return (
        <ChatItem
            avatar={{
                avatar: "😁",
                title: "用户",
            }}
            actions={renderActions()}
            key={messageItem.id}
            renderMessage={renderMessage}
        />
    )
}