import { ChatItem, ChatMessage } from "@lobehub/ui/chat";
import UserMessage from "./user";
import AssistantMessage from "./assistant";
import { MessageItem } from "..";

interface MessageProps {
    messageItem: MessageItem;
    handleDelete: (messageId: string) => void;
}

export default function Message({ messageItem, handleDelete }: MessageProps) {

    if (messageItem.role === "user") {
        return <UserMessage messageItem={messageItem} handleDelete={handleDelete} />
    }

    if (messageItem.role === "assistant") {
        return <AssistantMessage messageItem={messageItem} handleDelete={handleDelete} />
    }
}