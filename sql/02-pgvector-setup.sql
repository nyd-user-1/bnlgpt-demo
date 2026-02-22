-- NSRgpt: Enable pgvector and add embedding column
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column (256 dimensions for text-embedding-3-small)
ALTER TABLE nsr ADD COLUMN IF NOT EXISTS embedding vector(256);

-- 3. Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_nsr_embedding
  ON nsr USING hnsw (embedding vector_cosine_ops);

-- 4. Create the semantic search RPC function
CREATE OR REPLACE FUNCTION match_nsr_records(
  query_embedding vector(256),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  filter_year int DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  key_number text,
  pub_year int,
  reference text,
  authors text,
  title text,
  doi text,
  exfor_keys text,
  keywords text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.key_number,
    n.pub_year,
    n.reference,
    n.authors,
    n.title,
    n.doi,
    n.exfor_keys,
    n.keywords,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM nsr n
  WHERE
    n.embedding IS NOT NULL
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
    AND (filter_year IS NULL OR n.pub_year = filter_year)
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
