import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

interface Filters {
  year?: number;
  exforOnly?: boolean;
}

async function fetchRecords(filters: Filters): Promise<NsrRecord[]> {
  let query = supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords")
    .order("pub_year", { ascending: false })
    .order("key_number", { ascending: false })
    .limit(1000);

  if (filters.year) {
    query = query.eq("pub_year", filters.year);
  }
  if (filters.exforOnly) {
    query = query.not("exfor_keys", "is", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useNsrRecords(filters: Filters = {}) {
  return useQuery({
    queryKey: ["nsr-records", filters.year ?? "all", filters.exforOnly ?? false],
    queryFn: () => fetchRecords(filters),
    staleTime: 1000 * 60 * 10,
  });
}
