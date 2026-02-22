-- Distinct value RPCs for + menu categories.
-- Each returns paginated distinct values with record counts, supporting ILIKE search.
-- SECURITY DEFINER ensures RLS doesn't block the anon role.

-- Nuclides: unnest the nuclides TEXT[] array, deduplicate, sort, search, paginate
CREATE OR REPLACE FUNCTION get_distinct_nuclides(
  p_search TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 30,
  p_offset INT  DEFAULT 0
)
RETURNS TABLE(value TEXT, record_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    u.val                 AS value,
    COUNT(*)              AS record_count
  FROM nsr n,
       unnest(n.nuclides) AS u(val)
  WHERE
    (p_search IS NULL OR u.val ILIKE '%' || p_search || '%')
  GROUP BY u.val
  ORDER BY u.val
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Reactions: unnest the reactions TEXT[] array, deduplicate, sort, search, paginate
CREATE OR REPLACE FUNCTION get_distinct_reactions(
  p_search TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 30,
  p_offset INT  DEFAULT 0
)
RETURNS TABLE(value TEXT, record_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    u.val                 AS value,
    COUNT(*)              AS record_count
  FROM nsr n,
       unnest(n.reactions) AS u(val)
  WHERE
    (p_search IS NULL OR u.val ILIKE '%' || p_search || '%')
  GROUP BY u.val
  ORDER BY u.val
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Authors: split semicolon-separated string, trim, deduplicate, sort, search, paginate
CREATE OR REPLACE FUNCTION get_distinct_authors(
  p_search TEXT DEFAULT NULL,
  p_limit  INT  DEFAULT 30,
  p_offset INT  DEFAULT 0
)
RETURNS TABLE(value TEXT, record_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    TRIM(a.name)          AS value,
    COUNT(*)              AS record_count
  FROM nsr n,
       unnest(string_to_array(n.authors, ';')) AS a(name)
  WHERE
    TRIM(a.name) <> ''
    AND (p_search IS NULL OR TRIM(a.name) ILIKE '%' || p_search || '%')
  GROUP BY TRIM(a.name)
  ORDER BY TRIM(a.name)
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Reload PostgREST schema cache so it discovers the new functions
NOTIFY pgrst, 'reload schema';
