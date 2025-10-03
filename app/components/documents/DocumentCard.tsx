import React from 'react';

interface DocumentCardProps {
    doc: {
        id: string;
        filename: string;
        doc_type?: string;
        file_size: number;
        created_at: string;
    };
    comparisonMode: boolean;
    isSelected: boolean;
    onSelect: (docId: string, checked: boolean) => void;
    onDelete: (docId: string) => void;
    formatFileSize: (bytes: number) => string;
    formatDate: (dateString: string) => string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
    doc,
    comparisonMode,
    isSelected,
    onSelect,
    onDelete,
    formatFileSize,
    formatDate
}) => {
    return (
        <div className="p-2 bg-warm-50 rounded-lg border border-warm-200 hover:bg-warm-100 transition-colors">
            <div className="flex justify-between items-start">
                {comparisonMode && (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(doc.id, e.target.checked)}
                        className="mr-2 mt-1"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal truncate text-warm-800">
                        📄 {doc.filename}
                        {doc.doc_type && doc.doc_type !== 'general' && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-info/10 text-info rounded">
                                {doc.doc_type}
                            </span>
                        )}
                    </p>
                    <p className="text-[10px] text-warm-500 mt-0.5">
                        {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(doc.id)}
                    className="ml-2 text-red-500 hover:text-red-600 text-xs transition-colors"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
};

export default DocumentCard;
