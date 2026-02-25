import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrendPoint {
  nuclide: string;
  pub_year: number;
  paper_count: number;
  yoy_pct: number | null;
}

export interface ComparePoint {
  pub_year: number;
  left_count: number;
  right_count: number;
  spread: number;
}

export interface HeatmapPoint {
  nuclide: string;
  pub_year: number;
  paper_count: number;
}

export function useNuclideTrend(nuclide: string | null, startYear?: number, endYear?: number) {
  return useQuery({
    queryKey: ["terminal-trend", nuclide, startYear, endYear],
    enabled: Boolean(nuclide),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nuclide_trend", {
        p_nuclide: nuclide!,
        p_start_year: startYear ?? null,
        p_end_year: endYear ?? null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as TrendPoint[];
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useCompareNuclides(left: string | null, right: string | null, startYear?: number, endYear?: number) {
  return useQuery({
    queryKey: ["terminal-compare", left, right, startYear, endYear],
    enabled: Boolean(left && right),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("compare_nuclide_trends", {
        p_left_nuclide: left!,
        p_right_nuclide: right!,
        p_start_year: startYear ?? null,
        p_end_year: endYear ?? null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as ComparePoint[];
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useNuclideHeatmap(startYear: number | null, endYear: number | null) {
  return useQuery({
    queryKey: ["terminal-heatmap", startYear, endYear],
    enabled: Boolean(startYear && endYear),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nuclide_heatmap", {
        p_start_year: startYear!,
        p_end_year: endYear!,
        p_limit: 20,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as HeatmapPoint[];
    },
    staleTime: 1000 * 60 * 15,
  });
}
