import React from 'react';

interface FileUploaderProps {
    file: File | null;
    uploading: boolean;
    uploadStatus: string;
    autoSummary: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
    onAutoSummaryChange: (checked: boolean) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    file,
    uploading,
    uploadStatus,
    autoSummary,
    onFileChange,
    onUpload,
    onAutoSummaryChange
}) => {
    return (
        <div className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-800 mb-3 text-sm">📎 Документы проекта</h3>

            <input
                id="fileInput"
                type="file"
                onChange={onFileChange}
                className="block w-full mb-2 text-xs text-warm-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-warm-200 file:text-xs file:bg-warm-50 file:text-warm-700 hover:file:bg-warm-100 file:transition-colors"
                accept=".txt,.docx,.xlsx,.xls,.csv"
            />

            <div className="text-xs text-warm-500 mb-2">
                Поддерживаются: DOCX, TXT, XLSX, XLS, CSV
            </div>

            <button
                onClick={onUpload}
                disabled={!file || uploading}
                className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-normal transition-colors"
            >
                {uploading ? '⏳ Загрузка...' : '📤 Загрузить'}
            </button>

            {uploadStatus && (
                <div className={`mt-2 p-2 rounded-lg text-xs border ${
                    uploadStatus.includes('❌')
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-green-50 text-green-600 border-green-200'
                }`}>
                    {uploadStatus}
                </div>
            )}

            <label className="flex items-center gap-2 mt-3 text-xs text-warm-700">
                <input
                    type="checkbox"
                    checked={autoSummary}
                    onChange={(e) => onAutoSummaryChange(e.target.checked)}
                    className="rounded"
                />
                Создавать саммари при загрузке
            </label>
        </div>
    );
};

export default FileUploader;
