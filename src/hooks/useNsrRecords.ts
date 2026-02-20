import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

async function fetchRecords(): Promise<NsrRecord[]> {
  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords")
    .order("key_number", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useNsrRecords() {
  return useQuery({
    queryKey: ["nsr-records"],
    queryFn: fetchRecords,
    staleTime: 1000 * 60 * 10,
  });
}
