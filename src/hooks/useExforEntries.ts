import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExforEntry {
  exfor_id: string;
  title: string | null;
  doi: string | null;
  targets: string[] | null;
  processes: string[] | null;
  observables: string[] | null;
  year: number | null;
  facility: string | null;
  num_datasets: number | null;
}

async function fetchExforEntries(exforKeys: string[]): Promise<ExforEntry[]> {
  const { data, error } = await supabase
    .from("exfor_entries")
    .select("exfor_id, title, doi, targets, processes, observables, year, facility, num_datasets")
    .in("exfor_id", exforKeys);

  if (error) throw new Error(error.message);
  return (data ?? []) as ExforEntry[];
}

export function useExforEntries(exforKeys: string | null) {
  const keys = exforKeys
    ? exforKeys.split(";").map((k) => k.trim()).filter(Boolean)
    : [];

  return useQuery({
    queryKey: ["exfor-entries", keys],
    queryFn: () => fetchExforEntries(keys),
    enabled: keys.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}
