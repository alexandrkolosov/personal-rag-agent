import React from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import SuggestedQuestions from './SuggestedQuestions';
import ChatInput from './ChatInput';

interface ChatWindowProps {
    projectName: string;
    projectRole: string;
    documentCount: number;
    messages: any[];
    suggestedQuestions: string[];
    question: string;
    asking: boolean;
    webSearchEnabled: boolean;
    onQuestionChange: (question: string) => void;
    onSubmit: () => void;
    onExport: (format: 'markdown' | 'csv' | 'docx') => void;
    onClearChat: () => void;
    onSuggestedQuestionClick: (question: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    projectName,
    projectRole,
    documentCount,
    messages,
    suggestedQuestions,
    question,
    asking,
    webSearchEnabled,
    onQuestionChange,
    onSubmit,
    onExport,
    onClearChat,
    onSuggestedQuestionClick
}) => {
    return (
        <div className="lg:col-span-2 bg-white rounded-lg border border-warm-200 p-4 flex flex-col h-[calc(100vh-180px)]">
            <ChatHeader
                projectName={projectName}
                projectRole={projectRole}
                documentCount={documentCount}
                messageCount={messages.length}
                webSearchEnabled={webSearchEnabled}
                onExport={onExport}
                onClearChat={onClearChat}
            />

            <MessageList
                messages={messages}
                documentCount={documentCount}
            />

            <SuggestedQuestions
                questions={suggestedQuestions}
                onQuestionClick={onSuggestedQuestionClick}
            />

            <ChatInput
                question={question}
                asking={asking}
                onQuestionChange={onQuestionChange}
                onSubmit={onSubmit}
            />
        </div>
    );
};

export default ChatWindow;
