-- 09-research-feed.sql
-- Live research activity feed table + dedup RPC + Supabase Realtime

-- 1. Table
CREATE TABLE research_feed (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'activity',
  entity_type  TEXT,
  entity_value TEXT,
  display_text TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for reverse-chrono queries
CREATE INDEX idx_research_feed_created_at ON research_feed (created_at DESC);

-- 3. Dedup RPC — skips insert if matching event_type + entity_value exists within last 60s
CREATE OR REPLACE FUNCTION insert_feed_event(
  p_event_type  TEXT,
  p_category    TEXT DEFAULT 'activity',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_value TEXT DEFAULT NULL,
  p_display_text TEXT DEFAULT '',
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Dedup: skip if identical event within last 60 seconds
  IF EXISTS (
    SELECT 1 FROM research_feed
    WHERE event_type = p_event_type
      AND entity_value IS NOT DISTINCT FROM p_entity_value
      AND created_at > now() - interval '60 seconds'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO research_feed (event_type, category, entity_type, entity_value, display_text, metadata)
  VALUES (p_event_type, p_category, p_entity_type, p_entity_value, p_display_text, p_metadata);
END;
$$;

-- 4. RLS — anon can SELECT and INSERT
ALTER TABLE research_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feed events"
  ON research_feed FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert feed events"
  ON research_feed FOR INSERT
  WITH CHECK (true);

-- 5. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE research_feed;

-- 6. Grant anon access
GRANT SELECT, INSERT ON research_feed TO anon;
GRANT EXECUTE ON FUNCTION insert_feed_event TO anon;
