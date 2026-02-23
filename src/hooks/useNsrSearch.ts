import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type SearchMode = "semantic" | "keyword";

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

/** Text search via Supabase — matches across all major fields */
async function textSearch(query: string): Promise<NsrRecord[]> {
  const pattern = `%${query}%`;

  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords, nuclides, reactions")
    .or(`key_number.ilike.${pattern},title.ilike.${pattern},authors.ilike.${pattern},reference.ilike.${pattern},keywords.ilike.${pattern}`)
    .order("pub_year", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Run search based on mode */
async function searchNsr(query: string, mode: SearchMode): Promise<SearchResult> {
  if (mode === "keyword") {
    const results = await textSearch(query);
    return { records: results, count: results.length };
  }

  // semantic mode
  const results = await semanticSearch(query);
  return { records: results, count: results.length };
}

export function useNsrSearch(query: string, mode: SearchMode = "semantic") {
  return useQuery({
    queryKey: ["nsr-search", query, mode],
    queryFn: () => searchNsr(query, mode),
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 5,
  });
}
