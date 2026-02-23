-- 10-feed-insights.sql
-- Computed insight events: trending_nuclide, cross_interest
-- pg_cron schedules for aggregation + cleanup
-- pg_net schedule for high_impact_paper Edge Function

-- ============================================================
-- 1. compute_feed_insights() — pure SQL aggregation
-- ============================================================
CREATE OR REPLACE FUNCTION compute_feed_insights()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- ── Trending nuclide ──────────────────────────────────────
  -- entity_values with 3+ occurrences in the last hour
  -- (searches and filter events only)
  FOR rec IN
    SELECT entity_value, count(*) AS cnt
    FROM research_feed
    WHERE created_at > now() - interval '1 hour'
      AND entity_value IS NOT NULL
      AND event_type IN (
        'semantic_search', 'keyword_search',
        'nuclide_filter', 'reaction_filter', 'element_range_filter'
      )
    GROUP BY entity_value
    HAVING count(*) >= 3
  LOOP
    PERFORM insert_feed_event(
      'trending_nuclide',
      'insight',
      'entity',
      rec.entity_value,
      'Trending: ' || rec.entity_value || ' (' || rec.cnt || ' searches in the last hour)',
      jsonb_build_object('count', rec.cnt, 'window', '1h')
    );
  END LOOP;

  -- cross_interest removed
END;
$$;

-- Grant execute to service role (cron runs as superuser, but be explicit)
GRANT EXECUTE ON FUNCTION compute_feed_insights TO postgres;

-- ============================================================
-- 2. pg_cron schedules
-- ============================================================
-- NOTE: pg_cron and pg_net must be enabled in the Supabase dashboard
-- (Database → Extensions) before running this migration.

-- Enable extensions (idempotent — no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule compute_feed_insights every 15 minutes
SELECT cron.schedule(
  'compute-feed-insights',
  '*/15 * * * *',
  'SELECT compute_feed_insights()'
);

-- Schedule high_impact_paper Edge Function every 30 minutes via pg_net
-- Replace <SUPABASE_URL> and <SUPABASE_ANON_KEY> with actual values
SELECT cron.schedule(
  'compute-high-impact',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/compute-insights',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- 3. Cleanup: delete events older than 7 days, daily at 3am UTC
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-feed-events',
  '0 3 * * *',
  $$DELETE FROM research_feed WHERE created_at < now() - interval '7 days'$$
);
