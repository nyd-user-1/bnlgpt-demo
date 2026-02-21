-- Add structured search columns for nuclide, reaction, and Z-value filtering
-- These are parsed from the free-text `keywords` field by scripts/parse-keywords.py

ALTER TABLE nsr ADD COLUMN IF NOT EXISTS nuclides TEXT[];
ALTER TABLE nsr ADD COLUMN IF NOT EXISTS reactions TEXT[];
ALTER TABLE nsr ADD COLUMN IF NOT EXISTS z_values INT[];

-- GIN indexes for array overlap (&&) queries
CREATE INDEX IF NOT EXISTS idx_nsr_nuclides ON nsr USING gin (nuclides);
CREATE INDEX IF NOT EXISTS idx_nsr_reactions ON nsr USING gin (reactions);
CREATE INDEX IF NOT EXISTS idx_nsr_z_values ON nsr USING gin (z_values);
