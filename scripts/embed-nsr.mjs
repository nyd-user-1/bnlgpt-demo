/**
 * Generate embeddings for all NSR records that don't have one yet.
 * Uses OpenAI text-embedding-3-small (256 dimensions).
 *
 * Requires env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://stsumwwmyijxutabzice.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_KEY || !OPENAI_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY env vars");
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 50;
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 256;

async function getEmbeddings(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      dimensions: DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

// Fetch records without embeddings
const { data: records, error } = await supabase
  .from("nsr")
  .select("id, title, keywords")
  .is("embedding", null)
  .order("id");

if (error) {
  console.error("Failed to fetch records:", error.message);
  process.exit(1);
}

console.log(`Found ${records.length} records without embeddings.`);

let processed = 0;
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);

  // Build embedding text: title + keywords
  const texts = batch.map((r) => {
    const parts = [r.title];
    if (r.keywords) parts.push(r.keywords);
    return parts.join(" ");
  });

  console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);
  const embeddings = await getEmbeddings(texts);

  // Update each record with its embedding
  for (let j = 0; j < batch.length; j++) {
    const { error: updateError } = await supabase
      .from("nsr")
      .update({ embedding: embeddings[j] })
      .eq("id", batch[j].id);

    if (updateError) {
      console.error(`  Failed to update ${batch[j].id}:`, updateError.message);
    }
  }

  processed += batch.length;
  console.log(`  Done. ${processed}/${records.length}`);
}

console.log(`\nEmbedding complete! ${processed} records processed.`);
