-- Standardize ENDF report dates
-- Run this in the Supabase SQL Editor
--
-- Current formats in report_date:
--   ""              → NULL
--   "2010"          → 2010-01-01
--   "Apr 2014"      → 2014-04-01
--   "June 2010"     → 2010-06-01
--   "Nov. 2020"     → 2020-11-01
--   "Feb-2002"      → 2002-02-01
--   "Apr-67"        → 1967-04-01   (2-digit: 00-26 → 20xx, 27-99 → 19xx)

-- Step 1: Add a proper DATE column
ALTER TABLE endf_reports ADD COLUMN IF NOT EXISTS report_date_parsed DATE;

-- Step 2: Parse every format into a real date
UPDATE endf_reports
SET report_date_parsed = CASE
  -- Empty / null
  WHEN report_date IS NULL OR trim(report_date) = '' THEN NULL

  -- Year only: "2010", "2011"
  WHEN report_date ~ '^\d{4}$' THEN
    make_date(report_date::int, 1, 1)

  -- "Mon YYYY": "Apr 2014", "Aug 2014"
  WHEN report_date ~ '^[A-Za-z]{3} \d{4}$' THEN
    to_date(report_date, 'Mon YYYY')

  -- "Month YYYY": "June 2010"
  WHEN report_date ~ '^[A-Za-z]{4,} \d{4}$' THEN
    to_date(report_date, 'Month YYYY')

  -- "Mon. YYYY": "Nov. 2020"
  WHEN report_date ~ '^[A-Za-z]+\. \d{4}$' THEN
    to_date(replace(report_date, '.', ''), 'Mon YYYY')

  -- "Mon-YYYY": "Feb-2002", "Mar-2001"
  WHEN report_date ~ '^[A-Za-z]{3}-\d{4}$' THEN
    to_date(replace(report_date, '-', ' '), 'Mon YYYY')

  -- "Mon-YY": "Apr-67", "Sep-06"
  WHEN report_date ~ '^[A-Za-z]{3}-\d{2}$' THEN
    CASE
      WHEN (substring(report_date from '\d{2}$'))::int <= 26
      THEN make_date(2000 + (substring(report_date from '\d{2}$'))::int,
                     extract(month FROM to_date(substring(report_date from '^[A-Za-z]{3}'), 'Mon'))::int, 1)
      ELSE make_date(1900 + (substring(report_date from '\d{2}$'))::int,
                     extract(month FROM to_date(substring(report_date from '^[A-Za-z]{3}'), 'Mon'))::int, 1)
    END

  ELSE NULL
END;

-- Step 3: Verify — show any rows that didn't parse
SELECT id, report_number, report_date, report_date_parsed
FROM endf_reports
WHERE report_date IS NOT NULL
  AND trim(report_date) != ''
  AND report_date_parsed IS NULL
ORDER BY id;

-- Step 4: Quick sanity check — date range and count
SELECT
  count(*) AS total,
  count(report_date_parsed) AS parsed,
  min(report_date_parsed) AS earliest,
  max(report_date_parsed) AS latest
FROM endf_reports;
