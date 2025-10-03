-- Migration: Support mixed embedding dimensions (1536 and 3072)
-- This migration allows documents to use different embedding models

-- Step 1: First, let's check if we have any existing data
-- If you have existing documents with 1536 dimensions, we need to handle them

-- Option A: Delete all existing chunks (if you're okay losing existing data)
-- TRUNCATE TABLE doc_chunks CASCADE;
-- TRUNCATE TABLE documents CASCADE;

-- Option B: Keep existing data and add a dimension column to track which model was used
-- Add a column to track embedding dimensions
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS embedding_dimensions INT DEFAULT 1536;

-- Update existing rows to mark their dimension
UPDATE doc_chunks
SET embedding_dimensions = 1536
WHERE embedding_dimensions IS NULL OR embedding_dimensions = 0;

-- Now change the vector column to support maximum dimensions (3072)
ALTER TABLE doc_chunks ALTER COLUMN embedding TYPE vector(3072);

-- Step 2: Create an updated match function that filters by dimensions
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

-- Step 3: Add index on embedding_dimensions for faster filtering
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding_dimensions ON doc_chunks(embedding_dimensions);

-- Step 4: Recreate the embedding similarity index
DROP INDEX IF EXISTS idx_doc_chunks_embedding;
CREATE INDEX idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 5: Add comments
COMMENT ON COLUMN doc_chunks.embedding_dimensions IS 'The dimensionality of the embedding vector: 1536 for text-embedding-3-small, 3072 for text-embedding-3-large';
COMMENT ON FUNCTION match_doc_chunks IS 'Matches document chunks using vector similarity, filtering by embedding dimensions';
