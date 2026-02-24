import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const S2_FIELDS = [
  "title",
  "abstract",
  "authors",
  "authors.name",
  "year",
  "citationCount",
  "venue",
  "openAccessPdf",
].join(",");

interface S2Paper {
  paperId: string | null;
  title?: string;
  abstract?: string;
  authors?: { name: string }[];
  year?: number;
  citationCount?: number;
  venue?: string;
  openAccessPdf?: { url: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { doi } = await req.json();

    if (!doi || typeof doi !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid `doi` field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const s2ApiKey = Deno.env.get("SEMANTIC_SCHOLAR_API_KEY");
    const headers: Record<string, string> = {};
    if (s2ApiKey) {
      headers["x-api-key"] = s2ApiKey;
    }

    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${S2_FIELDS}`,
      { headers }
    );

    if (res.status === 404) {
      return new Response(
        JSON.stringify({ error: "Paper not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S2 API ${res.status}: ${text}`);
    }

    const paper: S2Paper = await res.json();

    return new Response(
      JSON.stringify({
        title: paper.title ?? null,
        abstract: paper.abstract ?? null,
        authors: paper.authors?.map((a) => a.name) ?? [],
        year: paper.year ?? null,
        citationCount: paper.citationCount ?? null,
        venue: paper.venue ?? null,
        openAccessPdfUrl: paper.openAccessPdf?.url ?? null,
        doi,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
