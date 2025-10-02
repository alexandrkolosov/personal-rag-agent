import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageItemProps {
    msg: {
        role: 'user' | 'assistant';
        content: string;
        sources?: any[];
        webSources?: any[];
        webImages?: any[];
        insights?: any[];
        follow_up_questions?: string[];
        perplexityModel?: string;
        usedWebSearch?: boolean;
    };
}

const MessageItem = React.memo(({ msg }: MessageItemProps) => {
    return (
        <div
            className={`p-3 rounded-lg ${
                msg.role === 'user'
                    ? 'bg-blue-900 ml-auto max-w-[80%]'
                    : 'bg-gray-700 mr-auto max-w-[80%]'
            }`}
        >
            <p className="text-sm font-semibold mb-1">
                {msg.role === 'user' ? '👤 Вы' : '🤖 Ассистент'}
            </p>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({children}) => <p className="text-gray-300 mb-2">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-bold text-gray-200 mt-4 mb-2">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-semibold text-gray-200 mt-3 mb-2">{children}</h2>,
                    ul: ({children}) => <ul className="list-disc pl-6 space-y-1 text-gray-300">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-6 space-y-1 text-gray-300">{children}</ol>,
                    code: ({inline, children}: any) =>
                        inline ?
                            <code className="bg-gray-700 px-1 py-0.5 rounded text-blue-400 text-xs">{children}</code> :
                            <pre className="bg-gray-800 p-3 rounded overflow-x-auto"><code className="text-blue-400">{children}</code></pre>,
                    blockquote: ({children}) =>
                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400">{children}</blockquote>,
                }}
            >
                {msg.content}
            </ReactMarkdown>

            {/* Показываем источники для ответов AI */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                    📌 Источники из документов:
                    {msg.sources.map((s: any, i: number) => (
                        <div key={i} className="ml-2">
                            • {s.quote?.substring(0, 100)}...
                        </div>
                    ))}
                </div>
            )}

            {/* Показываем web источники */}
            {msg.role === 'assistant' && msg.webSources && msg.webSources.length > 0 && (
                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                    🌐 Web источники:
                    {msg.webSources.filter((s: any) => s && s.url).map((s: any, i: number) => (
                        <div key={i} className="ml-2 mt-1">
                            {s.url ? (
                                <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                                >
                                    • {s.title || s.url}
                                    <span className="text-[10px]">↗</span>
                                </a>
                            ) : (
                                <span className="text-gray-500">• {s.title || 'Untitled'}</span>
                            )}
                            {s.snippet && (
                                <div className="ml-4 text-gray-500 italic text-[10px] mt-0.5">
                                    {s.snippet.substring(0, 120)}...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Показываем изображения из web search */}
            {msg.role === 'assistant' && msg.webImages && msg.webImages.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 mb-2">🖼️ Изображения:</div>
                    <div className="flex gap-2 flex-wrap">
                        {msg.webImages.slice(0, 4).map((img: any, i: number) => (
                            <img
                                key={i}
                                src={img.url || img}
                                alt={img.alt || `Image ${i+1}`}
                                className="w-20 h-20 object-cover rounded border border-gray-600"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Показываем модель Perplexity если использовалась */}
            {msg.role === 'assistant' && msg.usedWebSearch && msg.perplexityModel && (
                <div className="text-[10px] text-gray-500 mt-2">
                    🔍 {msg.perplexityModel}
                </div>
            )}
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
