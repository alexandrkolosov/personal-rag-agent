import React from 'react';
import { AI_ROLES } from '../modals/ProjectModal';

interface ChatHeaderProps {
    projectName: string;
    projectRole: string;
    documentCount: number;
    messageCount: number;
    webSearchEnabled: boolean;
    onExport: (format: 'markdown' | 'csv' | 'docx') => void;
    onClearChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    projectName,
    projectRole,
    documentCount,
    messageCount,
    webSearchEnabled,
    onExport,
    onClearChat
}) => {
    return (
        <div className="bg-warm-50 border border-warm-200 rounded-lg p-2 mb-3 text-xs flex justify-between items-center">
            <div>
                📁 Проект: <strong>{projectName}</strong> |
                🤖 Роль: <strong>{AI_ROLES[projectRole as keyof typeof AI_ROLES]?.split(' - ')[0] || projectRole}</strong> |
                📄 Документов: <strong>{documentCount}</strong> |
                💬 Сообщений: <strong>{messageCount}</strong>
                {webSearchEnabled && ' | 🌐 Web: ON'} | 💾 Cache: ON | ⏱️ Throttled
            </div>
            <div className="flex gap-2">
                {messageCount > 0 && (
                    <>
                        <button
                            onClick={() => onExport('markdown')}
                            className="text-warm-500 hover:text-warm-700 transition text-xs"
                            title="Экспорт в Markdown"
                        >
                            📝
                        </button>
                        <button
                            onClick={() => onExport('csv')}
                            className="text-warm-500 hover:text-warm-700 transition text-xs"
                            title="Экспорт в CSV"
                        >
                            📊
                        </button>
                        <button
                            onClick={() => onExport('docx')}
                            className="text-warm-500 hover:text-warm-700 transition text-xs"
                            title="Экспорт в Word"
                        >
                            📄
                        </button>
                        <button
                            onClick={onClearChat}
                            className="text-warm-500 hover:text-warm-700 transition text-xs"
                            title="Очистить чат этого проекта"
                        >
                            🗑️
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;
