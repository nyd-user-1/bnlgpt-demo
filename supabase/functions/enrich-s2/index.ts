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
  "authors.name",
  "authors.hIndex",
  "authors.affiliations",
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

/**
 * Resolve a DOI via doi.org redirect to get the canonical/full DOI.
 * ShortDOIs like 10.1103/21c6-xvh6 redirect to the full URL,
 * from which we can extract the real DOI.
 */
async function resolveDoiRedirect(doi: string): Promise<string | null> {
  try {
    const res = await fetch(`https://doi.org/${doi}`, {
      method: "HEAD",
      redirect: "follow",
    });
    // The final URL after redirect contains the resolved resource.
    // Extract the DOI from common publisher URL patterns.
    const finalUrl = res.url;

    // Try doi.org content negotiation to get the canonical DOI directly
    const cnRes = await fetch(`https://doi.org/${doi}`, {
      method: "GET",
      headers: { Accept: "application/vnd.citationstyles.csl+json" },
      redirect: "follow",
    });
    if (cnRes.ok) {
      const metadata = await cnRes.json();
      if (metadata.DOI && metadata.DOI.toLowerCase() !== doi.toLowerCase()) {
        return metadata.DOI;
      }
    }

    // Fallback: try to extract DOI from APS/publisher redirect URLs
    // e.g., https://journals.aps.org/prc/abstract/10.1103/PhysRevC.113.014311
    const doiMatch = finalUrl.match(/\/(10\.\d{4,}\/[^\s?#]+)/);
    if (doiMatch && doiMatch[1].toLowerCase() !== doi.toLowerCase()) {
      return doiMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect if a DOI looks like a ShortDOI / non-standard format.
 * Standard DOIs usually have meaningful path segments (e.g., PhysRevC.113.014311).
 * Short/hash DOIs have short alphanumeric suffixes (e.g., 21c6-xvh6, 7s8m-vbz4).
 */
function looksLikeShortDoi(doi: string): boolean {
  // Extract the suffix after the registrant prefix (10.xxxx/)
  const parts = doi.split("/");
  if (parts.length < 2) return false;
  const suffix = parts.slice(1).join("/");
  // Short hash-like suffixes: 4-10 chars, alphanumeric with possible hyphens
  return /^[a-z0-9][-a-z0-9]{2,9}$/i.test(suffix);
}

function savePaper(
  supabase: ReturnType<typeof createClient>,
  recordId: number,
  paper: S2Paper
) {
  return supabase
    .from("nsr")
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
      s2_authors: paper.authors
        ? paper.authors.map((a) => ({
            name: a.name,
            hIndex: a.hIndex ?? null,
            affiliations: a.affiliations ?? [],
          }))
        : null,
      s2_lookup_status: "found",
      s2_looked_up_at: new Date().toISOString(),
    })
    .eq("id", recordId);
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
    const retry = body.retry === true; // Re-process not_found records
    const startTime = Date.now();

    // Find NSR records to process
    let query = supabase
      .from("nsr")
      .select("id, doi")
      .not("doi", "is", null)
      .not("doi", "eq", "")
      .order("id", { ascending: true })
      .limit(batchSize);

    if (retry) {
      // Re-process records that previously failed (likely ShortDOI issue)
      query = query.eq("s2_lookup_status", "not_found");
    } else {
      query = query.is("s2_lookup_status", null);
    }

    const { data: records, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const toProcess = records ?? [];

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, found: 0, not_found: 0, errors: 0, resolved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as pending
    const pendingIds = toProcess.map((r: { id: number }) => r.id);
    await supabase
      .from("nsr")
      .update({ s2_lookup_status: "pending" })
      .in("id", pendingIds);

    // Process in sub-batches of 100 (S2 unauthenticated safe limit)
    const SUB_BATCH = 100;
    let totalFound = 0;
    let totalNotFound = 0;
    let totalErrors = 0;
    let totalResolved = 0;

    for (let i = 0; i < toProcess.length; i += SUB_BATCH) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      const batch = toProcess.slice(i, i + SUB_BATCH);
      const dois = batch.map((r: { doi: string }) => r.doi);

      try {
        const results = await lookupBatch(dois);

        // Collect records that failed initial lookup for DOI resolution retry
        const failedRecords: { record: { id: number; doi: string }; index: number }[] = [];

        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const paper = results[j];

          if (paper && paper.paperId) {
            const { error: updateError } = await savePaper(supabase, record.id, paper);
            if (updateError) totalErrors++;
            else totalFound++;
          } else if (looksLikeShortDoi(record.doi)) {
            // Queue for DOI resolution retry
            failedRecords.push({ record, index: j });
          } else {
            const { error: updateError } = await supabase
              .from("nsr")
              .update({
                s2_lookup_status: "not_found",
                s2_looked_up_at: new Date().toISOString(),
              })
              .eq("id", record.id);

            if (updateError) totalErrors++;
            else totalNotFound++;
          }
        }

        // Retry failed records by resolving their ShortDOIs
        if (failedRecords.length > 0 && Date.now() - startTime < TIMEOUT_MS) {
          const resolvedDois: { record: { id: number; doi: string }; resolvedDoi: string }[] = [];

          for (const { record } of failedRecords) {
            if (Date.now() - startTime > TIMEOUT_MS) break;
            const resolved = await resolveDoiRedirect(record.doi);
            if (resolved) {
              resolvedDois.push({ record, resolvedDoi: resolved });
            } else {
              // Could not resolve — mark not_found
              await supabase
                .from("nsr")
                .update({
                  s2_lookup_status: "not_found",
                  s2_looked_up_at: new Date().toISOString(),
                })
                .eq("id", record.id);
              totalNotFound++;
            }
          }

          // Batch lookup the resolved DOIs
          if (resolvedDois.length > 0) {
            try {
              const retryResults = await lookupBatch(
                resolvedDois.map((r) => r.resolvedDoi)
              );

              for (let k = 0; k < resolvedDois.length; k++) {
                const { record } = resolvedDois[k];
                const paper = retryResults[k];

                if (paper && paper.paperId) {
                  const { error: updateError } = await savePaper(supabase, record.id, paper);
                  if (updateError) totalErrors++;
                  else {
                    totalFound++;
                    totalResolved++;
                  }
                } else {
                  await supabase
                    .from("nsr")
                    .update({
                      s2_lookup_status: "not_found",
                      s2_looked_up_at: new Date().toISOString(),
                    })
                    .eq("id", record.id);
                  totalNotFound++;
                }
              }
            } catch {
              // Mark all as not_found on batch failure
              for (const { record } of resolvedDois) {
                await supabase
                  .from("nsr")
                  .update({
                    s2_lookup_status: "not_found",
                    s2_looked_up_at: new Date().toISOString(),
                  })
                  .eq("id", record.id);
              }
              totalNotFound += resolvedDois.length;
            }
          }
        }
      } catch {
        // Mark entire sub-batch as error
        for (const record of batch) {
          await supabase
            .from("nsr")
            .update({
              s2_lookup_status: "error",
              s2_looked_up_at: new Date().toISOString(),
            })
            .eq("id", record.id);
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
        resolved: totalResolved,
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
