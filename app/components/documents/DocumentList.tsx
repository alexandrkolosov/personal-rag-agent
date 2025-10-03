import React from 'react';
import DocumentCard from './DocumentCard';

interface DocumentListProps {
    documents: any[];
    loadingDocs: boolean;
    comparisonMode: boolean;
    selectedDocs: string[];
    comparing: boolean;
    onRefresh: () => void;
    onDocSelect: (docId: string, checked: boolean) => void;
    onDocDelete: (docId: string) => void;
    onCompare: (mode: 'semantic' | 'ai_powered') => void;
    formatFileSize: (bytes: number) => string;
    formatDate: (dateString: string) => string;
}

const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    loadingDocs,
    comparisonMode,
    selectedDocs,
    comparing,
    onRefresh,
    onDocSelect,
    onDocDelete,
    onCompare,
    formatFileSize,
    formatDate
}) => {
    return (
        <div className="bg-white rounded-lg border border-warm-200 p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-warm-800 text-sm">
                    Файлы ({documents.length})
                </h3>
                <button
                    onClick={onRefresh}
                    disabled={loadingDocs}
                    className="text-xs text-accent-600 hover:text-accent-700"
                >
                    {loadingDocs ? '⏳' : '🔄'}
                </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
                {documents.length === 0 ? (
                    <p className="text-warm-400 text-center py-4 text-xs">
                        Документы еще не загружены
                    </p>
                ) : (
                    documents.map(doc => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            comparisonMode={comparisonMode}
                            isSelected={selectedDocs.includes(doc.id)}
                            onSelect={onDocSelect}
                            onDelete={onDocDelete}
                            formatFileSize={formatFileSize}
                            formatDate={formatDate}
                        />
                    ))
                )}
            </div>

            {/* Comparison Buttons */}
            {comparisonMode && selectedDocs.length >= 2 && (
                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => onCompare('semantic')}
                        disabled={comparing}
                        className="w-full bg-info hover:bg-info/90 disabled:bg-warm-300 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg text-sm font-normal transition-colors"
                    >
                        {comparing ? '⏳ Сравнение...' : `⚡ Быстрое сравнение (${selectedDocs.length} док.)`}
                    </button>
                    <button
                        onClick={() => onCompare('ai_powered')}
                        disabled={comparing}
                        className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg text-sm font-normal transition-colors"
                    >
                        {comparing ? '⏳ Сравнение...' : `🤖 AI-анализ (${selectedDocs.length} док.)`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DocumentList;
