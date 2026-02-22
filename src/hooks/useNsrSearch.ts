import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SearchResult {
  records: NsrRecord[];
  count: number;
}

/** Semantic search via edge function (embedding similarity) */
async function semanticSearch(query: string): Promise<NsrRecord[]> {
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
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search error ${res.status}: ${err}`);
  }

  return (await res.json()) as NsrRecord[];
}

/** Text search via Supabase — matches key_number, title, authors */
async function textSearch(query: string): Promise<NsrRecord[]> {
  const pattern = `%${query}%`;

  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords")
    .or(`key_number.ilike.${pattern},title.ilike.${pattern},authors.ilike.${pattern}`)
    .order("pub_year", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Run both searches in parallel, merge and deduplicate (semantic first) */
async function searchNsr(query: string): Promise<SearchResult> {
  const [semanticResults, textResults] = await Promise.allSettled([
    semanticSearch(query),
    textSearch(query),
  ]);

  const semantic = semanticResults.status === "fulfilled" ? semanticResults.value : [];
  const text = textResults.status === "fulfilled" ? textResults.value : [];

  // Merge: semantic results first, then text results not already present
  const seen = new Set(semantic.map((r) => r.id));
  const merged = [...semantic];
  for (const r of text) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
  }

  return { records: merged, count: merged.length };
}

export function useNsrSearch(query: string) {
  return useQuery({
    queryKey: ["nsr-search", query],
    queryFn: () => searchNsr(query),
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 5,
  });
}
