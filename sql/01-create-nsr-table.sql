-- NSRgpt: Create NSR table with full schema
-- Run this in Supabase SQL Editor if you need to recreate the table

DROP TABLE IF EXISTS nsr;

CREATE TABLE nsr (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_number TEXT NOT NULL UNIQUE,
  pub_year INT NOT NULL,
  reference TEXT,
  authors TEXT,
  title TEXT NOT NULL,
  doi TEXT,
  exfor_keys TEXT,
  keywords TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_nsr_pub_year ON nsr (pub_year DESC);
CREATE INDEX idx_nsr_key_number ON nsr (key_number);

-- Full text search (optional, generated from CSV import)
ALTER TABLE nsr ADD COLUMN IF NOT EXISTS fts tsvector;
CREATE INDEX idx_nsr_fts ON nsr USING gin (fts);

-- Row Level Security: public read, service_role write
ALTER TABLE nsr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read nsr" ON nsr
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert nsr" ON nsr
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update nsr" ON nsr
  FOR UPDATE USING (true);
