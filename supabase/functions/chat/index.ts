import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_BASE = `You are NSRgpt, an AI research assistant from the National Nuclear Data Center (NNDC) at Brookhaven National Laboratory.

INSTRUCTIONS:
- Always use the retrieved NSR records and Semantic Scholar papers below to inform your answer. Even when no record is an exact match, discuss what the retrieved records reveal about the topic — related isotopes, nearby nuclides, the same element, or similar reactions are all highly relevant.
- Cite NSR records by key number (e.g., 2024SM01). Reference specific findings from the records.
- Cite Semantic Scholar papers by title/author with their URL.
- Only say "no relevant records" if the retrieved list is truly empty or entirely unrelated to the question.
- Combine retrieved evidence with your general nuclear physics knowledge to give a thorough answer.
- Never fabricate key numbers, DOIs, or author names.`;

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  userMessage: string;
  systemContext?: string;
}

interface NsrResult {
  key_number: string;
  title: string;
  authors: string | null;
  pub_year: number;
  doi: string | null;
  keywords: string | null;
  similarity: number;
}

interface S2Paper {
  title: string;
  authors?: Array<{ name: string }>;
  year?: number;
  abstract?: string;
  citationCount?: number;
  url?: string;
  externalIds?: Record<string, string>;
}

function formatNsrContext(records: NsrResult[]): string {
  if (records.length === 0) return "\n## Retrieved NSR Records\nNo relevant records found.";

  const lines = records.map((r, i) => {
    const parts = [
      `[${i + 1}] ${r.key_number} — "${r.title}"`,
      `    Authors: ${r.authors ?? "N/A"} | Year: ${r.pub_year}${r.doi ? ` | DOI: ${r.doi}` : ""}`,
    ];
    if (r.keywords) {
      parts.push(`    Keywords: ${r.keywords.slice(0, 200)}`);
    }
    return parts.join("\n");
  });

  return `\n## Retrieved NSR Records\n${lines.join("\n\n")}`;
}

function formatS2Context(papers: S2Paper[]): string {
  if (papers.length === 0) return "";

  const lines = papers.map((p, i) => {
    const authorStr = p.authors?.map((a) => a.name).join(", ") ?? "Unknown";
    const parts = [
      `[S${i + 1}] "${p.title}" — ${authorStr} (${p.year ?? "N/A"}) | ${p.citationCount ?? 0} citations`,
    ];
    if (p.abstract) {
      parts.push(`     Abstract: ${p.abstract.slice(0, 200)}...`);
    }
    if (p.url) {
      parts.push(`     ${p.url}`);
    }
    return parts.join("\n");
  });

  return `\n\n## Related Papers (Semantic Scholar)\n${lines.join("\n\n")}`;
}

/** Extract nuclide mentions like "100Br", "208Pb", "6He" from text */
function extractNuclides(text: string): string[] {
  const patterns = [
    /\b(\d{1,3})([A-Z][a-z]?)\b/g,           // 100Br, 208Pb, 6He
    /\b([A-Z][a-z]?)-?(\d{1,3})\b/g,          // Br-100, Pb208
  ];
  const found = new Set<string>();
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      // Normalize to "100Br" form
      const isNumFirst = /^\d/.test(m[1]);
      const mass = isNumFirst ? m[1] : m[2];
      const sym = isNumFirst ? m[2] : m[1];
      found.add(`${mass}${sym[0].toUpperCase()}${sym.slice(1).toLowerCase()}`);
    }
  }
  return [...found];
}

/** Extract reaction mentions like "(p,n)", "(d,p)" from text */
function extractReactions(text: string): string[] {
  const pat = /\(([a-zA-Z0-9',]+)\)/g;
  const found = new Set<string>();
  let m;
  while ((m = pat.exec(text)) !== null) {
    // Only keep if it looks like a nuclear reaction (has a comma)
    if (m[1].includes(",")) {
      found.add(`(${m[1]})`);
    }
  }
  return [...found];
}

/** Extract author name from queries like "papers by A Gilman" or "what did Smith publish" */
function extractAuthorQuery(text: string): string | null {
  const patterns = [
    /(?:papers?|publications?|work|research|articles?)\s+(?:by|from|of)\s+(.+?)(?:\?|$|\.|\bin\b|\bfrom\b|\babout\b)/i,
    /(?:by|from)\s+(?:author\s+)?(.+?)(?:\s+(?:are|is|in|on|about|from)\b|\?|$|\.)/i,
    /(?:what\s+(?:did|has|have))\s+(.+?)\s+(?:publish|write|author|research|study|contribute)/i,
    /(?:authored?\s+by|written\s+by)\s+(.+?)(?:\?|$|\.)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const name = m[1].trim().replace(/[?.!,]+$/, "").trim();
      // Ignore if it looks like a nuclide or is too short
      if (name.length >= 3 && !/^\d+[A-Z][a-z]?$/.test(name)) {
        return name;
      }
    }
  }
  return null;
}

/** Fetch NSR records by author name via ilike */
async function fetchAuthorRecords(
  authorName: string | null,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<NsrResult[]> {
  if (!authorName) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("nsr")
    .select("key_number, title, authors, pub_year, doi, keywords")
    .ilike("authors", `%${authorName}%`)
    .order("pub_year", { ascending: false })
    .limit(8);

  if (error) {
    console.error("fetchAuthorRecords error:", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({ ...r, similarity: 1.0 }));
}

/** Fetch NSR records matching nuclides and/or reactions via the search_nsr_structured RPC */
async function fetchStructuredRecords(
  nuclides: string[],
  reactions: string[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<NsrResult[]> {
  if (nuclides.length === 0 && reactions.length === 0) return [];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc("search_nsr_structured", {
    p_nuclides: nuclides.length > 0 ? nuclides : null,
    p_reactions: reactions.length > 0 ? reactions : null,
    p_limit: 10,
  });

  if (error) {
    console.error("search_nsr_structured error:", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({ ...r, similarity: 1.0 }));
}

/** Merge structured + semantic results, deduplicating by key_number */
function mergeNsrResults(structured: NsrResult[], semantic: NsrResult[]): NsrResult[] {
  const seen = new Set<string>();
  const merged: NsrResult[] = [];
  // Structured matches first (exact nuclide hits)
  for (const r of structured) {
    if (!seen.has(r.key_number)) {
      seen.add(r.key_number);
      merged.push(r);
    }
  }
  // Then semantic matches
  for (const r of semantic) {
    if (!seen.has(r.key_number)) {
      seen.add(r.key_number);
      merged.push(r);
    }
  }
  return merged.slice(0, 12);
}

async function embedQuery(text: string, openaiKey: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 256,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const { data } = await res.json();
  return data[0].embedding;
}

async function fetchNsrRecords(
  queryEmbedding: number[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<NsrResult[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc("match_nsr_records", {
    query_embedding: queryEmbedding,
    match_threshold: 0.35,
    match_count: 8,
  });

  if (error) throw error;
  return (data ?? []) as NsrResult[];
}

async function fetchS2Papers(query: string, apiKey?: string): Promise<S2Paper[]> {
  try {
    const params = new URLSearchParams({
      query,
      limit: "5",
      fields: "title,authors,year,abstract,citationCount,url,externalIds",
    });

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      { headers },
    );

    if (!res.ok) return [];

    const json = await res.json();
    return (json.data ?? []) as S2Paper[];
  } catch {
    // Semantic Scholar is best-effort; don't fail the whole request
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, userMessage, systemContext } =
      (await req.json()) as ChatRequest;

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(JSON.stringify({ error: "userMessage is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const s2Key = Deno.env.get("SEMANTIC_SCHOLAR_API_KEY");

    // 1. Extract structured entities from the query
    const nuclides = extractNuclides(userMessage);
    const reactions = extractReactions(userMessage);
    const authorQuery = extractAuthorQuery(userMessage);

    // 2. Embed user message, fetch S2 papers, and structured searches in parallel
    const [queryEmbedding, s2Papers, structuredDbRecords, authorRecords] = await Promise.all([
      embedQuery(userMessage, openaiKey),
      fetchS2Papers(userMessage, s2Key),
      fetchStructuredRecords(nuclides, reactions, supabaseUrl, supabaseKey),
      fetchAuthorRecords(authorQuery, supabaseUrl, supabaseKey),
    ]);

    // 3. Semantic search + merge with structured results (author + nuclide/reaction first)
    const semanticRecords = await fetchNsrRecords(queryEmbedding, supabaseUrl, supabaseKey);
    const structuredRecords = mergeNsrResults(authorRecords, structuredDbRecords);
    const nsrRecords = mergeNsrResults(structuredRecords, semanticRecords);

    // 4. Build grounded system prompt
    const groundingContext =
      formatNsrContext(nsrRecords) + formatS2Context(s2Papers);

    const systemPrompt = systemContext
      ? `${SYSTEM_PROMPT_BASE}\n\n${systemContext}\n${groundingContext}`
      : `${SYSTEM_PROMPT_BASE}\n${groundingContext}`;

    // 5. Build the sources metadata
    const sources = {
      nsr: nsrRecords.map((r) => ({
        key_number: r.key_number,
        title: r.title,
        doi: r.doi,
        similarity: r.similarity,
      })),
      s2: s2Papers.map((p) => ({
        title: p.title,
        url: p.url ?? "",
        authors:
          p.authors?.map((a) => a.name).join(", ") ?? "Unknown",
        citations: p.citationCount ?? 0,
      })),
    };

    // 6. Build API messages for GPT-4o
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
      { role: "user", content: userMessage },
    ];

    // 7. Call GPT-4o with streaming
    const completionRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: apiMessages,
          stream: true,
          max_tokens: 2048,
        }),
      },
    );

    if (!completionRes.ok) {
      const err = await completionRes.text();
      throw new Error(`OpenAI completion error ${completionRes.status}: ${err}`);
    }

    // 8. Stream response back with sources prefix
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Emit sources event first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`),
        );

        // Pipe through the OpenAI SSE stream
        const reader = completionRes.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
