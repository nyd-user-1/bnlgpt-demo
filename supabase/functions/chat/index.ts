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

    // 1. Embed user message & fetch S2 papers in parallel
    const [queryEmbedding, s2Papers] = await Promise.all([
      embedQuery(userMessage, openaiKey),
      fetchS2Papers(userMessage, s2Key),
    ]);

    // 2. Retrieve NSR records
    const nsrRecords = await fetchNsrRecords(queryEmbedding, supabaseUrl, supabaseKey);

    // 3. Build grounded system prompt
    const groundingContext =
      formatNsrContext(nsrRecords) + formatS2Context(s2Papers);

    const systemPrompt = systemContext
      ? `${SYSTEM_PROMPT_BASE}\n\n${systemContext}\n${groundingContext}`
      : `${SYSTEM_PROMPT_BASE}\n${groundingContext}`;

    // 4. Build the sources metadata
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

    // 5. Build API messages for GPT-4o
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
      { role: "user", content: userMessage },
    ];

    // 6. Call GPT-4o with streaming
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

    // 7. Stream response back with sources prefix
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
