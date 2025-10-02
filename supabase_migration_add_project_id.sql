-- Migration: Add project_id to messages, documents, and doc_chunks tables
-- Run this in your Supabase SQL editor

-- 1. Add project_id column to messages table
ALTER TABLE messages
ADD COLUMN project_id UUID;

-- 2. Add project_id column to documents table if not exists
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS project_id UUID;

-- 3. Add project_id column to doc_chunks table if not exists
ALTER TABLE doc_chunks
ADD COLUMN IF NOT EXISTS project_id UUID;

-- 4. Create index for faster project filtering
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_project ON messages(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_project_id ON doc_chunks(project_id);

-- 5. Update match_doc_chunks function to support project filtering
CREATE OR REPLACE FUNCTION match_doc_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_user_id UUID,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    doc_chunks.id,
    doc_chunks.document_id,
    doc_chunks.chunk_text,
    doc_chunks.chunk_index,
    1 - (doc_chunks.embedding <=> query_embedding) AS similarity
  FROM doc_chunks
  WHERE doc_chunks.user_id = filter_user_id
    AND (filter_project_id IS NULL OR doc_chunks.project_id = filter_project_id)
    AND 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Optional: Migrate existing data to a default project (if you have existing data)
-- Uncomment and adjust if needed:
-- UPDATE messages SET project_id = (SELECT id FROM projects WHERE user_id = messages.user_id LIMIT 1) WHERE project_id IS NULL;
-- UPDATE documents SET project_id = (SELECT id FROM projects WHERE user_id = documents.user_id LIMIT 1) WHERE project_id IS NULL;
-- UPDATE doc_chunks SET project_id = (SELECT id FROM projects WHERE user_id = doc_chunks.user_id LIMIT 1) WHERE project_id IS NULL;

COMMENT ON COLUMN messages.project_id IS 'Links message to a specific project for chat isolation';
COMMENT ON COLUMN documents.project_id IS 'Links document to a specific project';
COMMENT ON COLUMN doc_chunks.project_id IS 'Links document chunk to a specific project for RAG filtering';
