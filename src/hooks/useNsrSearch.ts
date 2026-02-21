import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

interface SearchResult {
  records: NsrRecord[];
  count: number;
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 256,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function searchNsr(query: string): Promise<SearchResult> {
  const embedding = await embedQuery(query);

  // pgvector expects the embedding as a JSON string like "[0.1, 0.2, ...]"
  const { data, error } = await supabase.rpc("match_nsr_records", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 20,
  });

  if (error) throw new Error(error.message);
  const records = (data ?? []) as NsrRecord[];
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
