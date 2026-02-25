import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * enrich-elsevier
 *
 * Enrichment for NSR records that neither the S2 DOI batch lookup
 * nor the S2 title search could find.
 *
 * Uses the Scopus Abstract Retrieval API:
 *   GET https://api.elsevier.com/content/abstract/doi/{doi}
 *
 * Rate limit: 9 req/sec. We use a 120ms delay (~8 req/sec) to stay safe.
 */

const SCOPUS_BASE_URL = "https://api.elsevier.com/content/abstract/doi";
const TIMEOUT_MS = 50_000; // 50s — edge functions have a 60s limit
const DELAY_MS = 120; // ~8 req/sec, safely under 9 req/sec limit

interface ScopusAuthor {
  "ce:given-name"?: string;
  "ce:surname"?: string;
  "preferred-name"?: {
    "ce:given-name"?: string;
    "ce:surname"?: string;
  };
  "affiliation"?: { "@id"?: string } | { "@id"?: string }[];
}

interface ScopusAffiliation {
  "@id"?: string;
  "affilname"?: string;
  "affiliation-city"?: string;
  "affiliation-country"?: string;
}

interface ScopusCoredata {
  "dc:description"?: string;
  "citedby-count"?: string;
  "prism:publicationName"?: string;
  "prism:coverDate"?: string;
  "openaccessFlag"?: boolean;
  "dc:identifier"?: string;
}

interface ScopusSubjectArea {
  "@abbrev"?: string;
  "$"?: string;
}

interface ScopusResponse {
  "abstracts-retrieval-response"?: {
    coredata?: ScopusCoredata;
    authors?: {
      author?: ScopusAuthor[];
    };
    affiliation?: ScopusAffiliation | ScopusAffiliation[];
    "subject-areas"?: {
      "subject-area"?: ScopusSubjectArea[];
    };
  };
}

/**
 * Fetch a paper from Scopus by DOI using the Abstract Retrieval API.
 * Returns parsed response or null if 404 / not found.
 */
async function fetchFromScopus(
  doi: string,
  apiKey: string
): Promise<ScopusResponse | null> {
  const url = `${SCOPUS_BASE_URL}/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: {
      "X-ELS-APIKey": apiKey,
      Accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new Error("429: Rate limited by Scopus");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scopus API ${res.status}: ${text}`);
  }

  return await res.json();
}

/**
 * Fetch abstract via Scopus Search API as a fallback.
 * The Search API often returns dc:description even for basic API keys.
 */
async function fetchAbstractFromSearch(
  doi: string,
  apiKey: string
): Promise<string | null> {
  const url = `https://api.elsevier.com/content/search/scopus?query=DOI(${encodeURIComponent(doi)})&field=dc:description`;
  const res = await fetch(url, {
    headers: {
      "X-ELS-APIKey": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const entries = json?.["search-results"]?.entry;
  if (!entries || entries.length === 0) return null;

  const desc = entries[0]?.["dc:description"];
  return typeof desc === "string" && desc.length > 0 ? desc : null;
}

/**
 * Build an affiliation lookup map from the top-level affiliation array.
 */
function buildAffiliationMap(
  affiliations: ScopusAffiliation | ScopusAffiliation[] | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!affiliations) return map;
  const arr = Array.isArray(affiliations) ? affiliations : [affiliations];
  for (const aff of arr) {
    if (aff["@id"] && aff.affilname) {
      map.set(aff["@id"], aff.affilname);
    }
  }
  return map;
}

/**
 * Map Scopus response to the columns we write into NSR.
 */
function mapScopusToNsr(data: ScopusResponse) {
  const resp = data["abstracts-retrieval-response"];
  if (!resp) return null;

  const core = resp.coredata;
  if (!core) return null;

  const affMap = buildAffiliationMap(resp.affiliation);

  // Parse authors
  const rawAuthors = resp.authors?.author;
  const s2Authors = rawAuthors
    ? rawAuthors.map((a) => {
        const given =
          a["ce:given-name"] ??
          a["preferred-name"]?.["ce:given-name"] ??
          "";
        const surname =
          a["ce:surname"] ?? a["preferred-name"]?.["ce:surname"] ?? "";
        const name = `${given} ${surname}`.trim();

        // Resolve affiliations
        const affRefs = a.affiliation
          ? Array.isArray(a.affiliation)
            ? a.affiliation
            : [a.affiliation]
          : [];
        const affiliations = affRefs
          .map((ref) => (ref["@id"] ? affMap.get(ref["@id"]) : undefined))
          .filter((x): x is string => !!x);

        return {
          name,
          hIndex: null, // Scopus doesn't provide h-index in this endpoint
          affiliations,
        };
      })
    : null;

  // Parse subject areas as fields_of_study
  const subjectAreas = resp["subject-areas"]?.["subject-area"];
  const fieldsOfStudy = subjectAreas
    ? subjectAreas.map((s) => s["$"] ?? s["@abbrev"] ?? "").filter(Boolean)
    : null;

  return {
    abstract: core["dc:description"] ?? null,
    citation_count: core["citedby-count"]
      ? parseInt(core["citedby-count"], 10)
      : null,
    venue: core["prism:publicationName"] ?? null,
    publication_date: core["prism:coverDate"] ?? null,
    is_open_access: core["openaccessFlag"] ?? false,
    fields_of_study:
      fieldsOfStudy && fieldsOfStudy.length > 0 ? fieldsOfStudy : null,
    s2_authors: s2Authors,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elsevierApiKey = Deno.env.get("ELSEVIER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!elsevierApiKey) {
      throw new Error(
        "ELSEVIER_API_KEY not set. Run: supabase secrets set ELSEVIER_API_KEY=<key>"
      );
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(body.batch_size || 40, 1), 100);
    const mode = body.mode || "enrich"; // "enrich" or "backfill"
    const startTime = Date.now();

    let query;
    if (mode === "backfill") {
      // Backfill: records already "found" (by S2 or Elsevier) but missing abstract
      query = supabase
        .from("nsr")
        .select("id, doi")
        .eq("s2_lookup_status", "found")
        .is("abstract", null)
        .not("doi", "is", null)
        .not("doi", "eq", "")
        .order("id", { ascending: true })
        .limit(batchSize);
    } else {
      // Default: enrich records that S2 couldn't find
      query = supabase
        .from("nsr")
        .select("id, doi")
        .in("s2_lookup_status", ["not_found", "search_not_found"])
        .not("doi", "is", null)
        .not("doi", "eq", "")
        .order("id", { ascending: true })
        .limit(batchSize);
    }

    const { data: records, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const toProcess = records ?? [];

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          mode,
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
    let lastError: string | null = null;

    for (const record of toProcess) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      try {
        const scopusData = await fetchFromScopus(record.doi, elsevierApiKey);

        if (scopusData) {
          const mapped = mapScopusToNsr(scopusData);

          if (mode === "backfill") {
            // Backfill: only fill in the abstract (don't overwrite existing S2 data)
            let abstract = mapped?.abstract ?? null;

            // If Abstract Retrieval didn't include abstract, try Search API
            if (!abstract) {
              abstract = await fetchAbstractFromSearch(record.doi, elsevierApiKey);
            }

            if (abstract) {
              const { error: updateError } = await supabase
                .from("nsr")
                .update({ abstract })
                .eq("id", record.id);
              if (updateError) {
                totalErrors++;
              } else {
                totalFound++;
              }
            } else {
              totalNotFound++;
            }
          } else if (mapped) {
            const { error: updateError } = await supabase
              .from("nsr")
              .update({
                ...mapped,
                s2_lookup_status: "found",
                s2_looked_up_at: new Date().toISOString(),
              })
              .eq("id", record.id);

            if (updateError) {
              totalErrors++;
            } else {
              totalFound++;
            }
          } else {
            await supabase
              .from("nsr")
              .update({
                s2_lookup_status: "elsevier_not_found",
                s2_looked_up_at: new Date().toISOString(),
              })
              .eq("id", record.id);
            totalNotFound++;
          }
        } else {
          // Abstract Retrieval returned 404
          if (mode === "backfill") {
            // Still try Search API as fallback
            const abstract = await fetchAbstractFromSearch(record.doi, elsevierApiKey);
            if (abstract) {
              const { error: updateError } = await supabase
                .from("nsr")
                .update({ abstract })
                .eq("id", record.id);
              if (updateError) {
                totalErrors++;
              } else {
                totalFound++;
              }
            } else {
              totalNotFound++;
            }
          } else {
            await supabase
              .from("nsr")
              .update({
                s2_lookup_status: "elsevier_not_found",
                s2_looked_up_at: new Date().toISOString(),
              })
              .eq("id", record.id);
            totalNotFound++;
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("429")) {
          break;
        }
        if (mode !== "backfill") {
          await supabase
            .from("nsr")
            .update({
              s2_lookup_status: "elsevier_not_found",
              s2_looked_up_at: new Date().toISOString(),
            })
            .eq("id", record.id);
        }
        // Capture first error for debugging
        if (!lastError) lastError = `id=${record.id} doi=${record.doi}: ${msg}`;
        totalErrors++;
      }

      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        processed: toProcess.length,
        found: totalFound,
        not_found: totalNotFound,
        errors: totalErrors,
        last_error: lastError,
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
