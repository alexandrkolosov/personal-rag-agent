import React from 'react';
import MessageItem from '../MessageItem';

interface MessageListProps {
    messages: any[];
    documentCount: number;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    documentCount
}) => {
    return (
        <div className="flex-1 overflow-y-auto mb-3 space-y-3">
            {messages.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-warm-500 text-sm">
                        {documentCount > 0
                            ? "✅ RAG активирован! Задавайте вопросы по документам"
                            : "Загрузите документы и начните задавать вопросы"}
                    </p>
                </div>
            ) : (
                messages.map((msg, idx) => (
                    <MessageItem key={idx} msg={msg} />
                ))
            )}
        </div>
    );
};

export default MessageList;
