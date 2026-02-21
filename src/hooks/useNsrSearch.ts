import { useQuery } from "@tanstack/react-query";
import type { NsrRecord } from "@/types/nsr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SearchResult {
  records: NsrRecord[];
  count: number;
}

async function searchNsr(query: string): Promise<SearchResult> {
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

  const records = (await res.json()) as NsrRecord[];
  return { records, count: records.length };
}

export function useNsrSearch(query: string) {
  return useQuery({
    queryKey: ["nsr-search", query],
    queryFn: () => searchNsr(query),
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 5,
  });
}
