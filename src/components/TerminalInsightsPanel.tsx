import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompareNuclides, useNuclideHeatmap, useNuclideTrend } from "@/hooks/useTerminalAnalytics";

interface TerminalInsightsPanelProps {
  terminalActive: boolean;
  nuclide: string | null;
  trendWindow: string | null;
  compare: { left: string; right: string } | null;
  heatmap: { start: number; end: number } | null;
}

function parseTrendWindow(windowToken: string | null) {
  if (!windowToken) return null;
  const yearMatch = windowToken.match(/(\d+)y/i);
  if (!yearMatch) return null;
  const years = Number(yearMatch[1]);
  if (!Number.isFinite(years)) return null;
  const endYear = new Date().getFullYear();
  return { startYear: endYear - years + 1, endYear };
}

export function TerminalInsightsPanel({ terminalActive, nuclide, trendWindow, compare, heatmap }: TerminalInsightsPanelProps) {
  const effectiveTrendWindow = trendWindow ?? (nuclide ? "10y" : null);
  const trendRange = parseTrendWindow(effectiveTrendWindow);
  const trend = useNuclideTrend(nuclide, trendRange?.startYear, trendRange?.endYear);
  const compareSeries = useCompareNuclides(compare?.left ?? null, compare?.right ?? null, undefined, undefined);
  const heatmapSeries = useNuclideHeatmap(heatmap?.start ?? null, heatmap?.end ?? null);

  const isVisible = terminalActive || Boolean((nuclide && trendWindow) || compare || heatmap);
  if (!isVisible) return null;

  return (
    <Card className="p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Terminal Mode</Badge>
        {nuclide && effectiveTrendWindow && <span className="text-sm">Trend {nuclide} ({effectiveTrendWindow})</span>}
        {compare && <span className="text-sm">Compare {compare.left} vs {compare.right}</span>}
        {heatmap && <span className="text-sm">Heatmap {heatmap.start}-{heatmap.end}</span>}
      </div>

      {terminalActive && (
        <div className="text-xs text-muted-foreground">
          Terminal analytics are shown here when you run commands like
          <span className="font-mono"> /trend Cu-64 10y</span>,
          <span className="font-mono"> /compare Cu-64 vs Zn-68</span>, or
          <span className="font-mono"> /heatmap 2018-2026</span>.
        </div>
      )}

      {nuclide && effectiveTrendWindow && (
        <div className="text-sm">
          {trend.isLoading && <p className="text-muted-foreground">Loading trend signal…</p>}
          {trend.data && trend.data.length > 0 && (
            <p>
              Latest count: <strong>{trend.data[trend.data.length - 1].paper_count}</strong>
              {" · "}
              YoY: <strong>{trend.data[trend.data.length - 1].yoy_pct ?? 0}%</strong>
            </p>
          )}
          {trend.data && trend.data.length === 0 && (
            <p className="text-muted-foreground">No trend rows returned for this nuclide/window.</p>
          )}
        </div>
      )}

      {compare && (
        <div className="text-sm">
          {compareSeries.isLoading && <p className="text-muted-foreground">Loading comparison spread…</p>}
          {compareSeries.data && compareSeries.data.length > 0 && (
            <p>
              Latest spread ({compare.left} - {compare.right}):
              <strong> {compareSeries.data[compareSeries.data.length - 1].spread}</strong>
            </p>
          )}
          {compareSeries.data && compareSeries.data.length === 0 && (
            <p className="text-muted-foreground">No overlapping years found for this comparison.</p>
          )}
        </div>
      )}

      {heatmap && (
        <div className="text-sm">
          {heatmapSeries.isLoading && <p className="text-muted-foreground">Loading heatmap matrix…</p>}
          {heatmapSeries.data && (
            <p>
              Cells loaded: <strong>{heatmapSeries.data.length}</strong>
            </p>
          )}
          {heatmapSeries.data && heatmapSeries.data.length === 0 && (
            <p className="text-muted-foreground">No heatmap cells found for the selected year range.</p>
          )}
        </div>
      )}
    </Card>
  );
}
