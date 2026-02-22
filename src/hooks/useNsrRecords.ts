import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

interface Filters {
  year?: number;
  exforOnly?: boolean;
  page?: number;
  pageSize?: number;
}

interface PaginatedResult {
  records: NsrRecord[];
  totalCount: number;
}

async function fetchRecords(filters: Filters): Promise<PaginatedResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 99;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords, nuclides", { count: "exact" })
    .order("pub_year", { ascending: false })
    .order("key_number", { ascending: false })
    .range(from, to);

  if (filters.year) {
    query = query.eq("pub_year", filters.year);
  }
  if (filters.exforOnly) {
    query = query.not("exfor_keys", "is", null);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { records: data ?? [], totalCount: count ?? 0 };
}

export function useNsrRecords(filters: Filters = {}) {
  return useQuery({
    queryKey: ["nsr-records", filters.year ?? "all", filters.exforOnly ?? false, filters.page ?? 1, filters.pageSize ?? 99],
    queryFn: () => fetchRecords(filters),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
}
