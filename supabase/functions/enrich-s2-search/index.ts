import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * enrich-s2-search
 *
 * Fallback enrichment for NSR records that the DOI-based batch lookup
 * could not find (ShortDOIs, missing DOIs, etc.).
 *
 * Uses the S2 Paper Title Match endpoint:
 *   GET /graph/v1/paper/search/match?query=TITLE&fields=...
 *
 * This returns a single best-match paper or 404 if nothing is close.
 * Rate limit: ~1 req/sec (unauthenticated). We add a 1.1s delay between requests.
 */

const S2_MATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search/match";
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

const TIMEOUT_MS = 50_000; // 50s — edge functions have a 60s limit

interface S2Paper {
  paperId: string | null;
  matchScore?: number;
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

/**
 * Search S2 by title using the /search/match endpoint.
 * Returns the matched paper or null if 404/no match.
 */
async function searchByTitle(title: string): Promise<S2Paper | null> {
  const url = `${S2_MATCH_URL}?query=${encodeURIComponent(title)}&fields=${S2_FIELDS}`;
  const res = await fetch(url);

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S2 match API ${res.status}: ${text}`);
  }

  const json = await res.json();
  // The match endpoint returns { data: [paper] } with a single result
  const paper = json.data?.[0] ?? json;
  if (!paper || !paper.paperId) return null;
  return paper;
}

/**
 * Normalize a title for comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple similarity check: does the S2 result title closely match our title?
 * Uses normalized prefix matching — if one title starts with the other
 * (accounting for truncation), or if they're very similar.
 */
function titlesMatch(ours: string, theirs: string): boolean {
  const a = normalize(ours);
  const b = normalize(theirs);
  if (a === b) return true;
  // One starts with the other (handles truncated titles)
  if (a.startsWith(b) || b.startsWith(a)) return true;
  // Check word overlap (Jaccard)
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && intersection / union > 0.7;
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
    const batchSize = Math.min(Math.max(body.batch_size || 20, 1), 50);
    const startTime = Date.now();

    // Find NSR records with not_found status (DOI batch lookup failed)
    const { data: records, error: fetchError } = await supabase
      .from("nsr")
      .select("id, title, doi")
      .eq("s2_lookup_status", "not_found")
      .not("title", "is", null)
      .not("title", "eq", "")
      .order("id", { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    const toProcess = records ?? [];

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          found: 0,
          not_found: 0,
          errors: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalFound = 0;
    let totalNotFound = 0;
    let totalErrors = 0;

    for (const record of toProcess) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      try {
        const paper = await searchByTitle(record.title);

        if (paper && paper.paperId && paper.title && titlesMatch(record.title, paper.title)) {
          const { error: updateError } = await savePaper(supabase, record.id, paper);
          if (updateError) {
            totalErrors++;
          } else {
            totalFound++;
          }
        } else {
          // No match — mark as search_not_found so we don't retry endlessly
          await supabase
            .from("nsr")
            .update({
              s2_lookup_status: "search_not_found",
              s2_looked_up_at: new Date().toISOString(),
            })
            .eq("id", record.id);
          totalNotFound++;
        }
      } catch (err) {
        const msg = (err as Error).message;
        // Rate limited — stop processing, don't mark as error
        if (msg.includes("429")) {
          break;
        }
        await supabase
          .from("nsr")
          .update({
            s2_lookup_status: "not_found",
            s2_looked_up_at: new Date().toISOString(),
          })
          .eq("id", record.id);
        totalErrors++;
      }

      // Rate limit: ~1 request per 1.1 seconds
      await new Promise((resolve) => setTimeout(resolve, 1100));
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
