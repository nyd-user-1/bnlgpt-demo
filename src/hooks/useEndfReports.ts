import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EndfReport } from "@/types/endf";

export type EndfSortField = "seq_number" | "report_date_parsed" | "authors";

interface Filters {
  query?: string;
  page?: number;
  pageSize?: number;
  sortBy?: EndfSortField;
  sortAsc?: boolean;
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
    .select("id, seq_number, report_number, authors, title, report_date, report_date_parsed, cross_reference, pdf_url", { count: "exact" });

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    query = query.or(`title.ilike.${pattern},authors.ilike.${pattern},report_number.ilike.${pattern}`);
  }

  const sortBy = filters.sortBy ?? "seq_number";
  const sortAsc = filters.sortAsc ?? false;

  if (sortBy === "authors") {
    query = query.order("authors", { ascending: sortAsc, nullsFirst: false });
  } else if (sortBy === "report_date_parsed") {
    query = query.order("report_date_parsed", { ascending: sortAsc, nullsFirst: false });
  } else {
    query = query.order("seq_number", { ascending: sortAsc });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { records: data ?? [], totalCount: count ?? 0 };
}

export function useEndfReports(filters: Filters = {}) {
  return useQuery({
    queryKey: ["endf-reports", filters.query ?? "", filters.page ?? 1, filters.pageSize ?? 99, filters.sortBy ?? "seq_number", filters.sortAsc ?? false],
    queryFn: () => fetchReports(filters),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
}
