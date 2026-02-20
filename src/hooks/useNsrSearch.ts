import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

interface SearchResult {
  records: NsrRecord[];
  count: number;
}

async function searchNsr(query: string): Promise<SearchResult> {
  const { data, error } = await supabase.functions.invoke<NsrRecord[]>(
    "semantic-search-nsr",
    { body: { query, match_count: 20, match_threshold: 0.3 } }
  );

  if (error) throw new Error(error.message);
  const records = data ?? [];
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
