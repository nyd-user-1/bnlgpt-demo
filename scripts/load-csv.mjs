/**
 * Load NSR CSV data into Supabase.
 * Usage: node scripts/load-csv.mjs [path-to-csv]
 * Defaults to ~/Downloads/nsr-results.csv
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 * (or set in .env.local)
 */

import { createReadStream } from "fs";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stsumwwmyijxutabzice.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const csvPath = process.argv[2] || `${process.env.HOME}/Downloads/nsr-results.csv`;

console.log(`Loading CSV from: ${csvPath}`);

const records = [];
const parser = createReadStream(csvPath).pipe(
  parse({ columns: true, trim: true, skip_empty_lines: true })
);

for await (const row of parser) {
  // Handle both original CSV columns and enriched columns
  const keyNumber = row["Key Number"] || row["key_number"];
  const title = row["Title"] || row["title"];
  if (!keyNumber || !title) continue;

  // Extract pub_year from key_number (e.g., "2026ZU01" → 2026)
  const yearMatch = keyNumber.match(/^(\d{4})/);
  const pubYear = row["pub_year"]
    ? parseInt(row["pub_year"])
    : yearMatch
      ? parseInt(yearMatch[1])
      : 2026;

  records.push({
    key_number: keyNumber,
    pub_year: pubYear,
    reference: row["Reference"] || row["reference"] || null,
    authors: row["Authors"] || row["authors"] || null,
    title: title,
    doi: row["DOI"] || row["doi"] || null,
    exfor_keys: row["EXFOR Keys"] || row["exfor_keys"] || null,
    keywords: row["Keywords"] || row["keywords"] || null,
  });
}

console.log(`Parsed ${records.length} records. Upserting in batches of 100...`);

const BATCH_SIZE = 100;
let inserted = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from("nsr")
    .upsert(batch, { onConflict: "key_number" });

  if (error) {
    console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
  } else {
    inserted += batch.length;
    console.log(`  Upserted ${inserted}/${records.length}`);
  }
}

console.log("Done!");
