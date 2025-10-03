-- Migration: Fix embedding dimensions to support both small (1536) and large (3072) models
-- This allows the system to use text-embedding-3-large for legal documents

-- 1. Drop the existing vector column constraint
ALTER TABLE doc_chunks ALTER COLUMN embedding TYPE vector(3072);

-- 2. Update the match_doc_chunks function to handle both dimensions
-- We'll need to check which embedding model was used and adjust accordingly
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

  RETURN QUERY
  SELECT
    doc_chunks.id,
    doc_chunks.document_id,
    doc_chunks.chunk_text,
    doc_chunks.chunk_index,
    CASE
      -- Only compare embeddings with matching dimensions
      WHEN array_length(doc_chunks.embedding::REAL[], 1) = query_dimensions
      THEN 1 - (doc_chunks.embedding <=> query_embedding)
      ELSE 0.0
    END AS similarity,
    doc_chunks.metadata
  FROM doc_chunks
  INNER JOIN documents ON doc_chunks.document_id = documents.id
  WHERE
    doc_chunks.user_id = filter_user_id
    AND (filter_project_id IS NULL OR doc_chunks.project_id = filter_project_id)
    AND array_length(doc_chunks.embedding::REAL[], 1) = query_dimensions
    AND (1 - (doc_chunks.embedding <=> query_embedding)) > match_threshold
  ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Add index for embedding similarity search
-- Note: pgvector supports different dimensions
DROP INDEX IF EXISTS idx_doc_chunks_embedding;
CREATE INDEX idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Add a helper function to get the correct embedding dimension for a document
CREATE OR REPLACE FUNCTION get_embedding_dimension(model_name TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE model_name
    WHEN 'text-embedding-3-large' THEN RETURN 3072;
    WHEN 'text-embedding-3-small' THEN RETURN 1536;
    ELSE RETURN 1536; -- default
  END CASE;
END;
$$;

COMMENT ON FUNCTION get_embedding_dimension IS 'Returns the embedding dimension for a given model name';
