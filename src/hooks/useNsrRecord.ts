import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NsrRecord } from "@/types/nsr";

async function fetchRecord(keyNumber: string): Promise<NsrRecord | null> {
  const { data, error } = await supabase
    .from("nsr")
    .select("id, key_number, pub_year, reference, authors, title, doi, exfor_keys, keywords")
    .eq("key_number", keyNumber)
    .single();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export function useNsrRecord(keyNumber: string | undefined) {
  return useQuery({
    queryKey: ["nsr-record", keyNumber],
    queryFn: () => fetchRecord(keyNumber!),
    enabled: !!keyNumber,
    staleTime: 1000 * 60 * 10,
  });
}
