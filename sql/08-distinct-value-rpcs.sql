-- Distinct value MATERIALIZED VIEWS for + menu categories.
-- Materialized views pre-compute the results so reads are instant.
-- Queryable via PostgREST .from().select() just like tables.
-- Refresh with: REFRESH MATERIALIZED VIEW distinct_nuclides; (etc.)

CREATE MATERIALIZED VIEW IF NOT EXISTS distinct_nuclides AS
SELECT u.val AS value, COUNT(*)::BIGINT AS record_count
FROM nsr n, unnest(n.nuclides) AS u(val)
GROUP BY u.val ORDER BY u.val;

CREATE MATERIALIZED VIEW IF NOT EXISTS distinct_reactions AS
SELECT u.val AS value, COUNT(*)::BIGINT AS record_count
FROM nsr n, unnest(n.reactions) AS u(val)
GROUP BY u.val ORDER BY u.val;

CREATE MATERIALIZED VIEW IF NOT EXISTS distinct_authors AS
SELECT TRIM(a.name) AS value, COUNT(*)::BIGINT AS record_count
FROM nsr n, unnest(string_to_array(n.authors, ';')) AS a(name)
WHERE TRIM(a.name) <> ''
GROUP BY TRIM(a.name) ORDER BY TRIM(a.name);

CREATE INDEX IF NOT EXISTS idx_distinct_nuclides_value ON distinct_nuclides(value);
CREATE INDEX IF NOT EXISTS idx_distinct_reactions_value ON distinct_reactions(value);
CREATE INDEX IF NOT EXISTS idx_distinct_authors_value ON distinct_authors(value);

GRANT SELECT ON distinct_nuclides TO anon;
GRANT SELECT ON distinct_reactions TO anon;
GRANT SELECT ON distinct_authors TO anon;

NOTIFY pgrst, 'reload schema';
