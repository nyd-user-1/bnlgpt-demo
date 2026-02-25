import { useQuery, type QueryFunctionContext } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IN_MEMORY_QUERY_CACHE_LIMIT = 10;

export type SearchMode = "semantic" | "keyword";

interface SearchMetrics {
  source: "edge_function" | "supabase_rest";
  query: string;
  mode: SearchMode;
  requestStartMs: number;
  responseEndMs: number;
  totalClientMs: number;
  payloadBytes: number;
  edgeTimings?: Record<string, number>;
}

interface SearchResult {
  records: NsrRecord[];
  count: number;
  metrics?: SearchMetrics;
}

const queryCache = new Map<string, SearchResult>();

function updateQueryCache(cacheKey: string, result: SearchResult) {
  queryCache.delete(cacheKey);
  queryCache.set(cacheKey, result);

  while (queryCache.size > IN_MEMORY_QUERY_CACHE_LIMIT) {
    const oldestKey = queryCache.keys().next().value;
    if (!oldestKey) break;
    queryCache.delete(oldestKey);
  }
}

function getCacheKey(query: string, mode: SearchMode) {
  return `${mode}:${query.trim().toLowerCase()}`;
}

function emitPerformanceTable(metrics: SearchMetrics) {
  console.table({
    query: metrics.query,
    mode: metrics.mode,
    source: metrics.source,
    total_client_ms: Number(metrics.totalClientMs.toFixed(1)),
    payload_kb: Number((metrics.payloadBytes / 1024).toFixed(2)),
    ...(metrics.edgeTimings ?? {}),
  });
}

/** Semantic search via edge function (embedding similarity + hybrid pre-filter) */
async function semanticSearch(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const requestStartMs = performance.now();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search-nsr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      match_count: 20,
      match_threshold: 0.3,
      prefilter_count: 200,
      include_timing: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search error ${res.status}: ${err}`);
  }

  const raw = await res.json();
  const responseEndMs = performance.now();
  const payloadBytes = JSON.stringify(raw).length;

  const records = Array.isArray(raw) ? raw : ((raw.records ?? []) as NsrRecord[]);
  const edgeTimings = Array.isArray(raw) ? undefined : raw.timings;

  const result: SearchResult = {
    records,
    count: records.length,
    metrics: {
      source: "edge_function",
      query,
      mode: "semantic",
      requestStartMs,
      responseEndMs,
      totalClientMs: responseEndMs - requestStartMs,
      payloadBytes,
      edgeTimings,
    },
  };

  if (result.metrics) emitPerformanceTable(result.metrics);
  return result;
}

/** Key number search — matches only key_number column */
async function keyNumberSearch(query: string): Promise<SearchResult> {
  const pattern = `%${query}%`;
  const requestStartMs = performance.now();

  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords, nuclides, reactions")
    .ilike("key_number", pattern)
    .order("key_number", { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);

  const responseEndMs = performance.now();
  const records = data ?? [];
  const payloadBytes = JSON.stringify(records).length;
  const result: SearchResult = {
    records,
    count: records.length,
    metrics: {
      source: "supabase_rest",
      query,
      mode: "keyword",
      requestStartMs,
      responseEndMs,
      totalClientMs: responseEndMs - requestStartMs,
      payloadBytes,
    },
  };

  if (result.metrics) emitPerformanceTable(result.metrics);
  return result;
}

/** Text search via Supabase — matches key_number, title, authors, keywords */
async function textSearch(query: string): Promise<SearchResult> {
  const pattern = `%${query}%`;
  const requestStartMs = performance.now();

  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords, nuclides, reactions")
    .or(`key_number.ilike.${pattern},title.ilike.${pattern},authors.ilike.${pattern},keywords.ilike.${pattern}`)
    .order("pub_year", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  const responseEndMs = performance.now();
  const records = data ?? [];
  const payloadBytes = JSON.stringify(records).length;
  const result: SearchResult = {
    records,
    count: records.length,
    metrics: {
      source: "supabase_rest",
      query,
      mode: "keyword",
      requestStartMs,
      responseEndMs,
      totalClientMs: responseEndMs - requestStartMs,
      payloadBytes,
    },
  };

  if (result.metrics) emitPerformanceTable(result.metrics);
  return result;
}

/** Run search based on mode */
async function searchNsr(query: string, mode: SearchMode, signal?: AbortSignal): Promise<SearchResult> {
  // # prefix → key_number only search
  if (query.startsWith("#")) {
    const keyQuery = query.slice(1).trim();
    if (!keyQuery) return { records: [], count: 0 };
    const result = await keyNumberSearch(keyQuery);
    if (keyQuery.length >= 1 && result.records.length > 0) {
      updateQueryCache(getCacheKey(query, mode), result);
    }
    return result;
  }

  if (mode === "keyword") {
    const result = await textSearch(query);
    if (query.length >= 3 && result.records.length > 0) {
      updateQueryCache(getCacheKey(query, mode), result);
    }
    return result;
  }

  // semantic mode
  const result = await semanticSearch(query, signal);
  if (query.length >= 3 && result.records.length > 0) {
    updateQueryCache(getCacheKey(query, mode), result);
  }
  return result;
}

export function useNsrSearch(query: string, mode: SearchMode = "semantic") {
  const cacheKey = getCacheKey(query, mode);

  return useQuery({
    queryKey: ["nsr-search", query, mode],
    queryFn: ({ signal }: QueryFunctionContext) => searchNsr(query, mode, signal),
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 5,
    placeholderData: queryCache.get(cacheKey),
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}
