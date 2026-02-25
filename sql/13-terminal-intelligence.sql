-- Terminal intelligence primitives for command-driven analytics panels

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_nuclide_year_counts AS
SELECT
  u.nuclide,
  n.pub_year,
  COUNT(*)::BIGINT AS paper_count
FROM nsr n
CROSS JOIN LATERAL unnest(n.nuclides) AS u(nuclide)
GROUP BY u.nuclide, n.pub_year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_nuclide_year_counts_unique
  ON mv_nuclide_year_counts (nuclide, pub_year);

CREATE INDEX IF NOT EXISTS idx_mv_nuclide_year_counts_year
  ON mv_nuclide_year_counts (pub_year DESC);

CREATE OR REPLACE FUNCTION get_nuclide_trend(
  p_nuclide TEXT,
  p_start_year INT DEFAULT NULL,
  p_end_year INT DEFAULT NULL
)
RETURNS TABLE (
  nuclide TEXT,
  pub_year INT,
  paper_count BIGINT,
  yoy_pct NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
WITH base AS (
  SELECT
    m.nuclide,
    m.pub_year,
    m.paper_count
  FROM mv_nuclide_year_counts m
  WHERE m.nuclide = p_nuclide
    AND (p_start_year IS NULL OR m.pub_year >= p_start_year)
    AND (p_end_year IS NULL OR m.pub_year <= p_end_year)
)
SELECT
  b.nuclide,
  b.pub_year,
  b.paper_count,
  ROUND(
    100.0 * (b.paper_count - LAG(b.paper_count) OVER (ORDER BY b.pub_year))
    / NULLIF(LAG(b.paper_count) OVER (ORDER BY b.pub_year), 0),
    2
  ) AS yoy_pct
FROM base b
ORDER BY b.pub_year;
$$;

CREATE OR REPLACE FUNCTION compare_nuclide_trends(
  p_left_nuclide TEXT,
  p_right_nuclide TEXT,
  p_start_year INT DEFAULT NULL,
  p_end_year INT DEFAULT NULL
)
RETURNS TABLE (
  pub_year INT,
  left_count BIGINT,
  right_count BIGINT,
  spread BIGINT
)
LANGUAGE SQL
STABLE
AS $$
WITH years AS (
  SELECT DISTINCT pub_year
  FROM mv_nuclide_year_counts
  WHERE (p_start_year IS NULL OR pub_year >= p_start_year)
    AND (p_end_year IS NULL OR pub_year <= p_end_year)
),
left_series AS (
  SELECT pub_year, paper_count
  FROM mv_nuclide_year_counts
  WHERE nuclide = p_left_nuclide
),
right_series AS (
  SELECT pub_year, paper_count
  FROM mv_nuclide_year_counts
  WHERE nuclide = p_right_nuclide
)
SELECT
  y.pub_year,
  COALESCE(l.paper_count, 0) AS left_count,
  COALESCE(r.paper_count, 0) AS right_count,
  COALESCE(l.paper_count, 0) - COALESCE(r.paper_count, 0) AS spread
FROM years y
LEFT JOIN left_series l ON l.pub_year = y.pub_year
LEFT JOIN right_series r ON r.pub_year = y.pub_year
ORDER BY y.pub_year;
$$;

CREATE OR REPLACE FUNCTION get_nuclide_heatmap(
  p_start_year INT,
  p_end_year INT,
  p_limit INT DEFAULT 40
)
RETURNS TABLE (
  nuclide TEXT,
  pub_year INT,
  paper_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
WITH top_nuclides AS (
  SELECT nuclide, SUM(paper_count) AS total_count
  FROM mv_nuclide_year_counts
  WHERE pub_year BETWEEN p_start_year AND p_end_year
  GROUP BY nuclide
  ORDER BY total_count DESC
  LIMIT p_limit
)
SELECT
  m.nuclide,
  m.pub_year,
  m.paper_count
FROM mv_nuclide_year_counts m
JOIN top_nuclides t ON t.nuclide = m.nuclide
WHERE m.pub_year BETWEEN p_start_year AND p_end_year
ORDER BY m.nuclide, m.pub_year;
$$;

GRANT SELECT ON mv_nuclide_year_counts TO anon;
GRANT EXECUTE ON FUNCTION get_nuclide_trend(TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION compare_nuclide_trends(TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_nuclide_heatmap(INT, INT, INT) TO anon;
