import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const S2_API_BASE = "https://api.semanticscholar.org/graph/v1/paper";
const CITATION_THRESHOLD = 50;
const MAX_LOOKUPS_PER_RUN = 5;

interface FeedRow {
  id: string;
  event_type: string;
  entity_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch recent record_inquiry events from the last hour that have a DOI
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: inquiries, error: fetchError } = await supabase
      .from("research_feed")
      .select("id, event_type, entity_value, metadata, created_at")
      .eq("event_type", "record_inquiry")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    // 2. Filter to those with a DOI in metadata
    const withDoi = (inquiries as FeedRow[]).filter(
      (row) => row.metadata?.doi && typeof row.metadata.doi === "string"
    );

    if (withDoi.length === 0) {
      return new Response(
        JSON.stringify({ message: "No record_inquiry events with DOI found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Deduplicate DOIs (only check each DOI once per run)
    const seenDois = new Set<string>();
    const toCheck: { doi: string; keyNumber: string | null }[] = [];
    for (const row of withDoi) {
      const doi = row.metadata.doi as string;
      if (!seenDois.has(doi) && toCheck.length < MAX_LOOKUPS_PER_RUN) {
        seenDois.add(doi);
        toCheck.push({ doi, keyNumber: row.entity_value });
      }
    }

    // 4. Look up each DOI on Semantic Scholar
    const results: string[] = [];

    for (const { doi, keyNumber } of toCheck) {
      try {
        const url = `${S2_API_BASE}/DOI:${doi}?fields=citationCount,title`;
        const res = await fetch(url);

        if (!res.ok) {
          // S2 returns 404 for unknown DOIs — skip silently
          continue;
        }

        const paper = (await res.json()) as {
          title?: string;
          citationCount?: number;
        };

        if (
          paper.citationCount != null &&
          paper.citationCount >= CITATION_THRESHOLD
        ) {
          // Insert high_impact_paper insight event via RPC (uses dedup)
          const displayText = `High-impact paper: ${
            paper.title?.slice(0, 70) ?? doi
          } (${paper.citationCount} citations)`;

          await supabase.rpc("insert_feed_event", {
            p_event_type: "high_impact_paper",
            p_category: "insight",
            p_entity_type: "doi",
            p_entity_value: doi,
            p_display_text: displayText,
            p_metadata: {
              doi,
              key_number: keyNumber,
              citation_count: paper.citationCount,
              title: paper.title,
            },
          });

          results.push(doi);
        }

        // Rate-limit: 100ms delay between S2 API calls
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Individual lookup failure — continue with next DOI
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        checked: toCheck.length,
        high_impact_inserted: results.length,
        dois: results,
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
