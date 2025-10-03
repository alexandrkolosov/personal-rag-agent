import React from 'react';
import FileUploader from './FileUploader';
import DocumentList from './DocumentList';

interface DocumentPanelProps {
    // File upload props
    file: File | null;
    uploading: boolean;
    uploadStatus: string;
    autoSummary: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
    onAutoSummaryChange: (checked: boolean) => void;

    // Document list props
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

const DocumentPanel: React.FC<DocumentPanelProps> = (props) => {
    return (
        <div className="lg:col-span-1 space-y-4">
            <FileUploader
                file={props.file}
                uploading={props.uploading}
                uploadStatus={props.uploadStatus}
                autoSummary={props.autoSummary}
                onFileChange={props.onFileChange}
                onUpload={props.onUpload}
                onAutoSummaryChange={props.onAutoSummaryChange}
            />

            <DocumentList
                documents={props.documents}
                loadingDocs={props.loadingDocs}
                comparisonMode={props.comparisonMode}
                selectedDocs={props.selectedDocs}
                comparing={props.comparing}
                onRefresh={props.onRefresh}
                onDocSelect={props.onDocSelect}
                onDocDelete={props.onDocDelete}
                onCompare={props.onCompare}
                formatFileSize={props.formatFileSize}
                formatDate={props.formatDate}
            />
        </div>
    );
};

export default DocumentPanel;
