-- Chat session persistence for NSRgpt
-- Run this in the Supabase SQL Editor

CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_updated ON chat_sessions (updated_at DESC);

-- Public read/write (no auth required for NSRgpt)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
