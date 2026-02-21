-- Structured search RPC supporting nuclide, reaction, Z-range, and year-range filters.
-- All filters are optional; only non-null parameters are applied.

CREATE OR REPLACE FUNCTION search_nsr_structured(
  p_nuclides   TEXT[]    DEFAULT NULL,
  p_reactions   TEXT[]    DEFAULT NULL,
  p_z_min       INT       DEFAULT NULL,
  p_z_max       INT       DEFAULT NULL,
  p_year_min    INT       DEFAULT NULL,
  p_year_max    INT       DEFAULT NULL,
  p_limit       INT       DEFAULT 50
)
RETURNS TABLE (
  id          INT,
  key_number  TEXT,
  pub_year    INT,
  reference   TEXT,
  authors     TEXT,
  title       TEXT,
  doi         TEXT,
  exfor_keys  TEXT,
  keywords    TEXT,
  nuclides    TEXT[],
  reactions   TEXT[]
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
    n.nuclides,
    n.reactions
  FROM nsr n
  WHERE
    (p_nuclides IS NULL OR n.nuclides && p_nuclides)
    AND (p_reactions IS NULL OR n.reactions && p_reactions)
    AND (p_z_min IS NULL OR EXISTS (
      SELECT 1 FROM unnest(n.z_values) AS z WHERE z >= p_z_min
    ))
    AND (p_z_max IS NULL OR EXISTS (
      SELECT 1 FROM unnest(n.z_values) AS z WHERE z <= p_z_max
    ))
    AND (p_year_min IS NULL OR n.pub_year >= p_year_min)
    AND (p_year_max IS NULL OR n.pub_year <= p_year_max)
  ORDER BY n.pub_year DESC, n.key_number DESC
  LIMIT p_limit;
END;
$$;
