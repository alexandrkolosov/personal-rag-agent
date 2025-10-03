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
                    ? 'bg-accent-50 ml-auto max-w-[80%] border border-accent-100'
                    : 'bg-warm-50 mr-auto max-w-[80%] border border-warm-200'
            }`}
        >
            <p className="text-[10px] font-normal mb-2 text-warm-500 uppercase">
                {msg.role === 'user' ? '👤 Вы' : '🤖 Ассистент'}
            </p>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({children}) => <p className="text-warm-700 mb-2 leading-relaxed text-sm">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-medium text-warm-800 mt-4 mb-2">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-medium text-warm-800 mt-3 mb-2">{children}</h2>,
                    ul: ({children}) => <ul className="list-disc pl-5 space-y-1 text-warm-700 my-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-5 space-y-1 text-warm-700 my-2">{children}</ol>,
                    code: ({inline, children}: any) =>
                        inline ?
                            <code className="bg-warm-100 px-1.5 py-0.5 rounded text-accent-600 text-xs font-mono">{children}</code> :
                            <pre className="bg-warm-100 border border-warm-200 p-3 rounded-lg overflow-x-auto my-2"><code className="text-accent-600 font-mono text-xs">{children}</code></pre>,
                    blockquote: ({children}) =>
                        <blockquote className="border-l-2 border-accent-400 pl-3 italic text-warm-600 my-2 text-sm">{children}</blockquote>,
                }}
            >
                {msg.content}
            </ReactMarkdown>

            {/* Показываем источники для ответов AI */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="text-xs text-warm-600 mt-3 pt-3 border-t border-warm-200">
                    <div className="font-normal mb-1.5 text-warm-500">📌 Источники из документов:</div>
                    {msg.sources.map((s: any, i: number) => (
                        <div key={i} className="ml-2 text-warm-500 leading-relaxed text-[11px]">
                            • {s.quote?.substring(0, 100)}...
                        </div>
                    ))}
                </div>
            )}

            {/* Показываем web источники */}
            {msg.role === 'assistant' && msg.webSources && msg.webSources.length > 0 && (
                <div className="text-xs text-warm-600 mt-3 pt-3 border-t border-warm-200">
                    <div className="font-normal mb-1.5 text-warm-500">🌐 Web источники:</div>
                    {msg.webSources.filter((s: any) => s && s.url).map((s: any, i: number) => (
                        <div key={i} className="ml-2 mt-1.5">
                            {s.url ? (
                                <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent-600 hover:text-accent-700 hover:underline inline-flex items-center gap-1 text-[11px]"
                                >
                                    • {s.title || s.url}
                                    <span className="text-[10px]">↗</span>
                                </a>
                            ) : (
                                <span className="text-warm-400 text-[11px]">• {s.title || 'Untitled'}</span>
                            )}
                            {s.snippet && (
                                <div className="ml-4 text-warm-500 italic text-[10px] mt-0.5 leading-relaxed">
                                    {s.snippet.substring(0, 120)}...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Показываем изображения из web search */}
            {msg.role === 'assistant' && msg.webImages && msg.webImages.length > 0 && (
                <div className="mt-3 pt-3 border-t border-warm-200">
                    <div className="text-xs text-warm-500 font-normal mb-2">🖼️ Изображения:</div>
                    <div className="flex gap-2 flex-wrap">
                        {msg.webImages.slice(0, 4).map((img: any, i: number) => {
                            // Handle different image formats from Perplexity
                            const imageUrl = typeof img === 'string' ? img : (img?.url || img?.imageUrl || null);

                            // Skip if no valid URL
                            if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
                                return null;
                            }

                            return (
                                <img
                                    key={i}
                                    src={imageUrl}
                                    alt={img.alt || img.description || `Image ${i+1}`}
                                    className="w-20 h-20 object-cover rounded-lg border border-warm-200"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Показываем модель Perplexity и оптимизацию если использовалась */}
            {msg.role === 'assistant' && msg.usedWebSearch && (
                <div className="text-[10px] text-warm-400 mt-2 flex gap-2">
                    {msg.perplexityModel && <span>🔍 {msg.perplexityModel}</span>}
                    {(msg as any).optimizationUsed && (msg as any).subQueriesExecuted && (
                        <span className="text-accent-500">
                            ⚡ Оптимизировано: {(msg as any).subQueriesExecuted} подзапросов
                        </span>
                    )}
                </div>
            )}
        </div>
    );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
