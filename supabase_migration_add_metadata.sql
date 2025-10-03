-- Migration: Add metadata support for legal document processing
-- This enables document type detection, metadata extraction, and comparison features

-- 1. Add metadata fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add metadata field to doc_chunks table
ALTER TABLE doc_chunks
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Create document_comparisons table to store comparison results
CREATE TABLE IF NOT EXISTS document_comparisons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_ids UUID[] NOT NULL,
    comparison_type TEXT NOT NULL, -- 'semantic', 'ai_powered'
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_metadata ON doc_chunks USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_document_comparisons_user_id ON document_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comparisons_project_id ON document_comparisons(project_id);

-- 5. Add comments for documentation
COMMENT ON COLUMN documents.doc_type IS 'Type of document: agreement, contract, legal, general';
COMMENT ON COLUMN documents.embedding_model IS 'Embedding model used: text-embedding-3-large or text-embedding-3-small';
COMMENT ON COLUMN documents.metadata IS 'Document-level metadata: entities, sections, key_terms, dates, parties, amounts';
COMMENT ON COLUMN doc_chunks.metadata IS 'Chunk-level metadata: section, clause_number, parties, dates, amounts, legal_references';
COMMENT ON TABLE document_comparisons IS 'Stores document comparison results for quick retrieval';
