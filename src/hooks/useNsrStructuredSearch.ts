import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

export interface StructuredSearchParams {
  nuclides?: string[];
  reactions?: string[];
}

async function structuredSearch(
  params: StructuredSearchParams,
): Promise<NsrRecord[]> {
  const { data, error } = await supabase.rpc("search_nsr_structured", {
    p_nuclides: params.nuclides?.length ? params.nuclides : null,
    p_reactions: params.reactions?.length ? params.reactions : null,
    p_limit: 50,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as NsrRecord[];
}

export function useNsrStructuredSearch(params: StructuredSearchParams | null) {
  const hasFilters =
    params !== null &&
    ((params.nuclides?.length ?? 0) > 0 || (params.reactions?.length ?? 0) > 0);

  return useQuery({
    queryKey: ["nsr-structured", params],
    queryFn: () => structuredSearch(params!),
    enabled: hasFilters,
    staleTime: 1000 * 60 * 5,
  });
}
