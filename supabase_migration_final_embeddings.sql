-- Migration: Support mixed embedding dimensions (1536 and 3072)
-- This handles existing data properly

-- Step 1: Add embedding_dimensions column FIRST (before changing vector type)
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS embedding_dimensions INT DEFAULT 1536;

-- Step 2: Mark all existing chunks with their current dimension
UPDATE doc_chunks
SET embedding_dimensions = 1536
WHERE embedding_dimensions IS NULL OR embedding_dimensions = 0;

-- Step 3: Create a temporary table with new schema
CREATE TABLE doc_chunks_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    project_id UUID,
    chunk_text TEXT NOT NULL,
    chunk_index INT NOT NULL,
    embedding vector(3072),  -- Support up to 3072 dimensions
    embedding_dimensions INT NOT NULL DEFAULT 1536,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 4: Copy data from old table, padding 1536-dim vectors to 3072
-- PostgreSQL will handle the padding automatically
INSERT INTO doc_chunks_new (
    id, document_id, user_id, project_id, chunk_text, chunk_index,
    embedding, embedding_dimensions, metadata, created_at
)
SELECT
    id, document_id, user_id, project_id, chunk_text, chunk_index,
    -- Pad 1536-dimension vectors to 3072 by appending zeros
    (embedding::text || repeat(',0', 3072 - array_length(embedding::real[], 1)))::vector(3072) as embedding,
    1536 as embedding_dimensions,
    metadata,
    created_at
FROM doc_chunks;

-- Step 5: Drop old table and rename new one
DROP TABLE doc_chunks CASCADE;
ALTER TABLE doc_chunks_new RENAME TO doc_chunks;

-- Step 6: Recreate foreign key constraints
ALTER TABLE doc_chunks
    ADD CONSTRAINT doc_chunks_document_id_fkey
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE;

ALTER TABLE doc_chunks
    ADD CONSTRAINT doc_chunks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

ALTER TABLE doc_chunks
    ADD CONSTRAINT doc_chunks_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

-- Step 7: Recreate indexes
CREATE INDEX idx_doc_chunks_document_id ON doc_chunks(document_id);
CREATE INDEX idx_doc_chunks_user_id ON doc_chunks(user_id);
CREATE INDEX idx_doc_chunks_project_id ON doc_chunks(project_id);
CREATE INDEX idx_doc_chunks_embedding_dimensions ON doc_chunks(embedding_dimensions);
CREATE INDEX idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 8: Create the updated match function
CREATE OR REPLACE FUNCTION match_doc_chunks(
  query_embedding VECTOR,
  match_threshold FLOAT,
  match_count INT,
  filter_user_id UUID,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  chunk_index INT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_dimensions INT;
BEGIN
  -- Get the dimensions of the query embedding
  query_dimensions := array_length(query_embedding::REAL[], 1);

  RAISE NOTICE 'Query dimensions: %', query_dimensions;

  RETURN QUERY
  SELECT
    doc_chunks.id,
    doc_chunks.document_id,
    doc_chunks.chunk_text,
    doc_chunks.chunk_index,
    (1 - (doc_chunks.embedding <=> query_embedding)) AS similarity,
    doc_chunks.metadata
  FROM doc_chunks
  INNER JOIN documents ON doc_chunks.document_id = documents.id
  WHERE
    doc_chunks.user_id = filter_user_id
    AND (filter_project_id IS NULL OR doc_chunks.project_id = filter_project_id)
    -- CRITICAL: Only compare embeddings with matching dimensions
    AND doc_chunks.embedding_dimensions = query_dimensions
    AND (1 - (doc_chunks.embedding <=> query_embedding)) > match_threshold
  ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 9: Add comments
COMMENT ON COLUMN doc_chunks.embedding_dimensions IS 'The dimensionality of the embedding vector: 1536 for text-embedding-3-small, 3072 for text-embedding-3-large';
COMMENT ON FUNCTION match_doc_chunks IS 'Matches document chunks using vector similarity, filtering by embedding dimensions';

-- Done! You can now upload documents with both 1536 and 3072 dimension embeddings
