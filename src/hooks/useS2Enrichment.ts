import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { S2Author } from "@/types/nsr";

export interface S2Enrichment {
  s2_paper_id: string | null;
  citation_count: number | null;
  influential_citation_count: number | null;
  reference_count: number | null;
  abstract: string | null;
  tldr: string | null;
  venue: string | null;
  publication_date: string | null;
  is_open_access: boolean;
  open_access_pdf_url: string | null;
  fields_of_study: string[] | null;
  s2_authors: S2Author[] | null;
  s2_lookup_status: "pending" | "found" | "not_found" | "error" | null;
  s2_looked_up_at: string | null;
}

const S2_COLUMNS = [
  "s2_paper_id",
  "citation_count",
  "influential_citation_count",
  "reference_count",
  "abstract",
  "tldr",
  "venue",
  "publication_date",
  "is_open_access",
  "open_access_pdf_url",
  "fields_of_study",
  "s2_authors",
"s2_lookup_status",
  "s2_looked_up_at",
].join(", ");

export function useS2Enrichment(nsrId: number | null) {
  return useQuery({
    queryKey: ["s2-enrichment", nsrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nsr")
        .select(S2_COLUMNS)
        .eq("id", nsrId!)
        .single();

      if (error) throw error;
      return data as unknown as S2Enrichment;
    },
    enabled: nsrId != null,
    staleTime: 1000 * 60 * 30,
  });
}
