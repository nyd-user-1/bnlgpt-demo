import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type EmbeddingCacheEntry = {
  embedding: number[];
  createdAt: number;
};

const EMBEDDING_CACHE_TTL_MS = 1000 * 60 * 30;
const EMBEDDING_CACHE_MAX_SIZE = 100;
const embeddingCache = new Map<string, EmbeddingCacheEntry>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function trimEmbeddingCache() {
  while (embeddingCache.size > EMBEDDING_CACHE_MAX_SIZE) {
    const oldestKey = embeddingCache.keys().next().value;
    if (!oldestKey) break;
    embeddingCache.delete(oldestKey);
  }
}

async function getQueryEmbedding(query: string) {
  const cacheKey = query.trim().toLowerCase();
  const now = Date.now();

  const cached = embeddingCache.get(cacheKey);
  if (cached && now - cached.createdAt < EMBEDDING_CACHE_TTL_MS) {
    return { embedding: cached.embedding, fromCache: true };
  }

  // Embed the query using OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not set in Supabase secrets");
  }

  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
      dimensions: 256,
    }),
  });

  if (!embeddingRes.ok) {
    const err = await embeddingRes.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const { data: embeddingData } = await embeddingRes.json();
  const embedding = embeddingData[0].embedding as number[];

  embeddingCache.set(cacheKey, { embedding, createdAt: now });
  trimEmbeddingCache();

  return { embedding, fromCache: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      query,
      match_count = 20,
      match_threshold = 0.3,
      filter_year,
      prefilter_count = 200,
      include_timing = true,
    } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const edgeStart = performance.now();
    const embeddingStart = performance.now();
    const { embedding: queryEmbedding, fromCache } = await getQueryEmbedding(query);
    const embeddingMs = performance.now() - embeddingStart;

    // Call optimized hybrid RPC
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rpcStart = performance.now();
    const { data, error } = await supabase.rpc("search_nsr_hybrid", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_threshold,
      match_count,
      filter_year: filter_year ?? null,
      prefilter_count,
    });
    const rpcMs = performance.now() - rpcStart;

    if (error) {
      // fallback to legacy semantic RPC to preserve behavior
      const legacyStart = performance.now();
      const { data: legacyData, error: legacyError } = await supabase.rpc("match_nsr_records", {
        query_embedding: queryEmbedding,
        match_threshold,
        match_count,
        filter_year: filter_year ?? null,
      });
      const legacyRpcMs = performance.now() - legacyStart;

      if (legacyError) throw legacyError;

      const edgeTotalMs = performance.now() - edgeStart;
      const payload = include_timing
        ? {
            records: legacyData,
            timings: {
              embedding_ms: Number(embeddingMs.toFixed(1)),
              embedding_cache_hit: fromCache ? 1 : 0,
              rpc_ms: Number(legacyRpcMs.toFixed(1)),
              edge_total_ms: Number(edgeTotalMs.toFixed(1)),
              fallback_legacy_rpc: 1,
            },
          }
        : legacyData;

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const edgeTotalMs = performance.now() - edgeStart;
    const payload = include_timing
      ? {
          records: data,
          timings: {
            embedding_ms: Number(embeddingMs.toFixed(1)),
            embedding_cache_hit: fromCache ? 1 : 0,
            rpc_ms: Number(rpcMs.toFixed(1)),
            db_execution_ms:
              data && data.length > 0 && typeof data[0].db_execution_ms === "number"
                ? Number(data[0].db_execution_ms.toFixed(1))
                : undefined,
            edge_total_ms: Number(edgeTotalMs.toFixed(1)),
          },
        }
      : data;

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
