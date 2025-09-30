-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           user_id UUID NOT NULL,
                           filename TEXT NOT NULL,
                           storage_path TEXT NOT NULL UNIQUE,
                           file_type TEXT NOT NULL,
                           file_size BIGINT NOT NULL,
                           content_preview TEXT,
                           created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                           updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table (for RAG)
CREATE TABLE doc_chunks (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                            user_id UUID NOT NULL,
                            chunk_text TEXT NOT NULL,
                            chunk_index INTEGER NOT NULL,
                            embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            UNIQUE(document_id, chunk_index)
);

-- Messages table (for chat history)
CREATE TABLE messages (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id UUID NOT NULL,
                          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                          content TEXT NOT NULL,
                          metadata JSONB,
                          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

CREATE INDEX idx_doc_chunks_document_id ON doc_chunks(document_id);
CREATE INDEX idx_doc_chunks_user_id ON doc_chunks(user_id);
CREATE INDEX idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
                              USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
                                     USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
USING (auth.uid() = user_id);

-- Doc chunks policies
CREATE POLICY "Users can view own chunks"
  ON doc_chunks FOR SELECT
                               USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks"
  ON doc_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks"
  ON doc_chunks FOR DELETE
USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
                             USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
USING (auth.uid() = user_id);

-- Storage bucket setup (run this in Supabase Dashboard -> Storage)
-- 1. Create bucket named 'documents' (private)
-- 2. Add policy for authenticated users to upload their own files:

-- Policy: "Users can upload own files"
-- Allowed operations: INSERT
-- Policy definition:
-- (bucket_id = 'documents') AND (auth.uid()::text = (storage.foldername(name))[1])

-- Policy: "Users can view own files"
-- Allowed operations: SELECT
-- Policy definition:
-- (bucket_id = 'documents') AND (auth.uid()::text = (storage.foldername(name))[1])

-- Policy: "Users can delete own files"
-- Allowed operations: DELETE
-- Policy definition:
-- (bucket_id = 'documents') AND (auth.uid()::text = (storage.foldername(name))[1])

-- Function for similarity search (will be used in Prompt B)
CREATE OR REPLACE FUNCTION match_doc_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_user_id UUID
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
  AND 1 - (doc_chunks.embedding <=> query_embedding) > match_threshold
ORDER BY doc_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;