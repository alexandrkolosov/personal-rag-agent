-- Migration: Add separate column for large embeddings (3072 dimensions)
-- This is the SIMPLE approach - no data conversion needed!

-- Step 1: Add new column for large embeddings
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS embedding_large vector(3072);

-- Step 2: Add column to track which embedding is being used
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- Step 3: Drop ALL existing versions of the function using DO block
DO $$
DECLARE
    func_sig text;
BEGIN
    FOR func_sig IN
        SELECT pg_get_function_identity_arguments(oid)
        FROM pg_proc
        WHERE proname = 'match_doc_chunks'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS match_doc_chunks(%s) CASCADE', func_sig);
    END LOOP;
END $$;

-- Create new search function that uses the appropriate embedding column
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
  use_large_model BOOLEAN;
BEGIN
  -- Get the dimensions of the query embedding
  query_dimensions := array_length(query_embedding::REAL[], 1);
  use_large_model := (query_dimensions = 3072);

  RAISE NOTICE 'Query dimensions: %, Using large model: %', query_dimensions, use_large_model;

  -- Use the appropriate embedding column based on query dimensions
  IF use_large_model THEN
    RETURN QUERY
    SELECT
      doc_chunks.id,
      doc_chunks.document_id,
      doc_chunks.chunk_text,
      doc_chunks.chunk_index,
      (1 - (doc_chunks.embedding_large <=> query_embedding)) AS similarity,
      doc_chunks.metadata
    FROM doc_chunks
    INNER JOIN documents ON doc_chunks.document_id = documents.id
    WHERE
      doc_chunks.user_id = filter_user_id
      AND (filter_project_id IS NULL OR doc_chunks.project_id = filter_project_id)
      AND doc_chunks.embedding_large IS NOT NULL  -- Only search docs with large embeddings
      AND (1 - (doc_chunks.embedding_large <=> query_embedding)) > match_threshold
    ORDER BY doc_chunks.embedding_large <=> query_embedding
    LIMIT match_count;
  ELSE
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
      AND doc_chunks.embedding IS NOT NULL  -- Only search docs with small embeddings
      AND (1 - (doc_chunks.embedding <=> query_embedding)) > match_threshold
    ORDER BY doc_chunks.embedding <=> query_embedding
    LIMIT match_count;
  END IF;
END;
$$;

-- Step 4: Add indexes for the new column
-- Note: pgvector indexes don't support more than 2000 dimensions yet
-- We'll skip the vector index for embedding_large and rely on sequential scan
-- For projects with legal docs, searches will still be fast enough
-- CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding_large ON doc_chunks USING hnsw (embedding_large vector_cosine_ops);

-- Add regular index for filtering by model
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding_model ON doc_chunks(embedding_model);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding_large_not_null ON doc_chunks(document_id) WHERE embedding_large IS NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN doc_chunks.embedding_large IS 'Large embedding vector (3072 dimensions) for text-embedding-3-large model';
COMMENT ON COLUMN doc_chunks.embedding_model IS 'Which embedding model was used: text-embedding-3-small or text-embedding-3-large';
COMMENT ON FUNCTION match_doc_chunks IS 'Matches document chunks using the appropriate embedding column based on query dimensions';

-- Done!
-- - Existing docs use 'embedding' column (1536 dims)
-- - New legal docs use 'embedding_large' column (3072 dims)
-- - Search automatically uses the right column
