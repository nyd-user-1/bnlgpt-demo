import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EndfReport } from "@/types/endf";

interface Filters {
  query?: string;
  page?: number;
  pageSize?: number;
}

interface PaginatedResult {
  records: EndfReport[];
  totalCount: number;
}

async function fetchReports(filters: Filters): Promise<PaginatedResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 99;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("endf_reports")
    .select("id, seq_number, report_number, authors, title, report_date, cross_reference, pdf_url", { count: "exact" });

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    query = query.or(`title.ilike.${pattern},authors.ilike.${pattern},report_number.ilike.${pattern}`);
  }

  query = query
    .order("seq_number", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { records: data ?? [], totalCount: count ?? 0 };
}

export function useEndfReports(filters: Filters = {}) {
  return useQuery({
    queryKey: ["endf-reports", filters.query ?? "", filters.page ?? 1, filters.pageSize ?? 99],
    queryFn: () => fetchReports(filters),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
}
