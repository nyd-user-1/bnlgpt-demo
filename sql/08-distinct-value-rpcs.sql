-- Distinct value VIEWS for + menu categories.
-- Views are queryable via PostgREST .from().select() just like tables,
-- matching the proven NYSgpt pattern. Pagination via .range(), search via .ilike().

-- Nuclides: unnest the nuclides TEXT[] array, deduplicate, count
CREATE OR REPLACE VIEW distinct_nuclides AS
SELECT
  u.val            AS value,
  COUNT(*)::BIGINT AS record_count
FROM nsr n,
     unnest(n.nuclides) AS u(val)
GROUP BY u.val
ORDER BY u.val;

-- Reactions: unnest the reactions TEXT[] array, deduplicate, count
CREATE OR REPLACE VIEW distinct_reactions AS
SELECT
  u.val            AS value,
  COUNT(*)::BIGINT AS record_count
FROM nsr n,
     unnest(n.reactions) AS u(val)
GROUP BY u.val
ORDER BY u.val;

-- Authors: split semicolon-separated string, trim, deduplicate, count
CREATE OR REPLACE VIEW distinct_authors AS
SELECT
  TRIM(a.name)    AS value,
  COUNT(*)::BIGINT AS record_count
FROM nsr n,
     unnest(string_to_array(n.authors, ';')) AS a(name)
WHERE TRIM(a.name) <> ''
GROUP BY TRIM(a.name)
ORDER BY TRIM(a.name);

-- Reload PostgREST schema cache so it discovers the new views
NOTIFY pgrst, 'reload schema';
