import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const S2_BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch";
const S2_FIELDS = [
  "title",
  "abstract",
  "tldr",
  "citationCount",
  "influentialCitationCount",
  "referenceCount",
  "venue",
  "year",
  "publicationDate",
  "isOpenAccess",
  "openAccessPdf",
  "fieldsOfStudy",
  "authors",
  "authors.hIndex",
  "authors.affiliations",
  "citationStyles",
].join(",");

const TIMEOUT_MS = 45_000;

interface S2Paper {
  paperId: string | null;
  title?: string;
  abstract?: string;
  tldr?: { text: string } | null;
  citationCount?: number;
  influentialCitationCount?: number;
  referenceCount?: number;
  venue?: string;
  year?: number;
  publicationDate?: string;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string } | null;
  fieldsOfStudy?: string[] | null;
  authors?: { name: string; hIndex?: number; affiliations?: string[] }[];
  citationStyles?: { bibtex?: string } | null;
}

async function lookupBatch(dois: string[]): Promise<(S2Paper | null)[]> {
  const ids = dois.map((d) => `DOI:${d}`);
  const res = await fetch(`${S2_BATCH_URL}?fields=${S2_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S2 batch API ${res.status}: ${text}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(body.batch_size || 100, 1), 500);
    const startTime = Date.now();

    // Find the highest nsr_id already in nsr_s2 so we can skip past it
    const { data: maxRow } = await supabase
      .from("nsr_s2")
      .select("nsr_id")
      .order("nsr_id", { ascending: false })
      .limit(1)
      .single();

    const startAfter = maxRow?.nsr_id ?? 0;

    // Find NSR records with DOIs that haven't been processed yet
    const { data: records, error: fetchError } = await supabase
      .from("nsr")
      .select("id, doi")
      .not("doi", "is", null)
      .not("doi", "eq", "")
      .gt("id", startAfter)
      .order("id", { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    const toProcess = records ?? [];

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, found: 0, not_found: 0, errors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert placeholder rows
    const placeholders = toProcess.map((r: { id: number; doi: string }) => ({
      nsr_id: r.id,
      doi: r.doi,
      lookup_status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("nsr_s2")
      .upsert(placeholders, { onConflict: "nsr_id", ignoreDuplicates: true });

    if (insertError) throw insertError;

    // Process in sub-batches of 100 (S2 unauthenticated safe limit)
    const SUB_BATCH = 100;
    let totalFound = 0;
    let totalNotFound = 0;
    let totalErrors = 0;

    for (let i = 0; i < toProcess.length; i += SUB_BATCH) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      const batch = toProcess.slice(i, i + SUB_BATCH);
      const dois = batch.map((r: { doi: string }) => r.doi);

      try {
        const results = await lookupBatch(dois);

        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const paper = results[j];

          if (paper && paper.paperId) {
            const { error: updateError } = await supabase
              .from("nsr_s2")
              .update({
                s2_paper_id: paper.paperId,
                citation_count: paper.citationCount ?? null,
                influential_citation_count: paper.influentialCitationCount ?? null,
                reference_count: paper.referenceCount ?? null,
                abstract: paper.abstract ?? null,
                tldr: paper.tldr?.text ?? null,
                venue: paper.venue ?? null,
                publication_date: paper.publicationDate ?? null,
                is_open_access: paper.isOpenAccess ?? false,
                open_access_pdf_url: paper.openAccessPdf?.url ?? null,
                fields_of_study: paper.fieldsOfStudy ?? null,
                authors: paper.authors
                  ? paper.authors.map((a) => ({
                      name: a.name,
                      hIndex: a.hIndex ?? null,
                      affiliations: a.affiliations ?? [],
                    }))
                  : null,
                bibtex: paper.citationStyles?.bibtex ?? null,
                lookup_status: "found",
                looked_up_at: new Date().toISOString(),
              })
              .eq("nsr_id", record.id);

            if (updateError) totalErrors++;
            else totalFound++;
          } else {
            const { error: updateError } = await supabase
              .from("nsr_s2")
              .update({
                lookup_status: "not_found",
                looked_up_at: new Date().toISOString(),
              })
              .eq("nsr_id", record.id);

            if (updateError) totalErrors++;
            else totalNotFound++;
          }
        }
      } catch {
        // Mark entire sub-batch as error
        for (const record of batch) {
          await supabase
            .from("nsr_s2")
            .update({
              lookup_status: "error",
              looked_up_at: new Date().toISOString(),
            })
            .eq("nsr_id", record.id);
        }
        totalErrors += batch.length;
      }

      // Rate limiting between sub-batches
      if (i + SUB_BATCH < toProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: toProcess.length,
        found: totalFound,
        not_found: totalNotFound,
        errors: totalErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
