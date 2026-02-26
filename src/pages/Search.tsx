import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, Calendar, Atom, Zap, ExternalLink, BookOpen,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import { useNsrSearch, type SearchMode } from "@/hooks/useNsrSearch";
import { SearchBox } from "@/components/SearchInput";
import { RecordDrawer } from "@/components/RecordDrawer";
import type { NsrRecord } from "@/types/nsr";

/* ------------------------------------------------------------------ */
/*  Stat helpers                                                        */
/* ------------------------------------------------------------------ */

interface CountEntry {
  value: string;
  count: number;
}

function countField(
  records: NsrRecord[],
  getter: (r: NsrRecord) => string[] | null | undefined,
): CountEntry[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const vals = getter(r);
    if (!vals) continue;
    for (const v of vals) {
      map.set(v, (map.get(v) ?? 0) + 1);
    }
  }
  return Array.from(map, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}

function countYears(records: NsrRecord[]): CountEntry[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.pub_year) {
      const y = String(r.pub_year);
      map.set(y, (map.get(y) ?? 0) + 1);
    }
  }
  return Array.from(map, ([value, count]) => ({ value, count })).sort(
    (a, b) => Number(a.value) - Number(b.value),
  );
}

/** Extract journal name from reference like "Phys.Rev. C 100, 064319 (2019)" */
function extractJournal(ref: string | null): string | null {
  if (!ref) return null;
  // Strip everything from the first digit-comma or digit-space-( pattern onward
  // to get "Phys.Rev. C" from "Phys.Rev. C 100, 064319 (2019)"
  const cleaned = ref
    .replace(/\s+\d+[\s,].*$/, "")  // strip from " 100, ..." onward
    .replace(/\s*\(.*$/, "")         // strip from " (" onward
    .trim()
    .replace(/[.,;:]+$/, "");        // strip trailing punctuation
  return cleaned.length >= 3 ? cleaned : null;
}

function countJournals(records: NsrRecord[]): CountEntry[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const j = extractJournal(r.reference);
    if (j) map.set(j, (map.get(j) ?? 0) + 1);
  }
  return Array.from(map, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}


/* ------------------------------------------------------------------ */
/*  Filter types                                                        */
/* ------------------------------------------------------------------ */

interface Filters {
  years: Set<string>;
  nuclides: Set<string>;
  reactions: Set<string>;
  journals: Set<string>;
}

const EMPTY_FILTERS: Filters = {
  years: new Set(),
  nuclides: new Set(),
  reactions: new Set(),
  journals: new Set(),
};

function applyFilters(records: NsrRecord[], filters: Filters): NsrRecord[] {
  return records.filter((r) => {
    if (filters.years.size > 0 && !filters.years.has(String(r.pub_year))) return false;
    if (filters.nuclides.size > 0) {
      if (!r.nuclides || !r.nuclides.some((n) => filters.nuclides.has(n))) return false;
    }
    if (filters.reactions.size > 0) {
      if (!r.reactions || !r.reactions.some((rx) => filters.reactions.has(rx))) return false;
    }
    if (filters.journals.size > 0) {
      const j = extractJournal(r.reference);
      if (!j || !filters.journals.has(j)) return false;
    }
    return true;
  });
}

function hasActiveFilters(f: Filters): boolean {
  return (
    f.years.size > 0 ||
    f.nuclides.size > 0 ||
    f.reactions.size > 0 ||
    f.journals.size > 0
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive StatWidget (table with clickable rows)                  */
/* ------------------------------------------------------------------ */

const MAX_WIDGET_ROWS = 8;

function StatWidget({
  icon,
  title,
  entries,
  activeValues,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  entries: CountEntry[];
  activeValues: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (entries.length === 0) return null;

  const visible = entries.slice(0, MAX_WIDGET_ROWS);
  const remaining = entries.length - visible.length;

  return (
    <div className="rounded-lg border border-border overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        {icon}
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {activeValues.size > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {activeValues.size} selected
          </span>
        )}
      </div>
      <div className="p-1">
        {visible.map((e) => {
          const isActive = activeValues.has(e.value);
          return (
            <button
              key={e.value}
              onClick={() => onToggle(e.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors text-left ${
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-xs truncate mr-2">{e.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {e.count}
              </span>
            </button>
          );
        })}
      </div>
      {remaining > 0 && (
        <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border/30">
          and {remaining} more
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Year bar chart widget                                               */
/* ------------------------------------------------------------------ */

function YearBarChart({
  entries,
  activeYears,
  onToggle,
}: {
  entries: CountEntry[];
  activeYears: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (entries.length === 0) return null;

  const data = entries.map((e) => ({
    year: e.value,
    count: e.count,
    fill: activeYears.size === 0 || activeYears.has(e.value)
      ? "#FF9933"
      : "#333333",
  }));

  return (
    <div className="rounded-lg border border-border overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Year</span>
      </div>
      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#8B7332" }}
              tickMargin={4}
            />
            <YAxis hide />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              onClick={(_data, index) => onToggle(data[index].year)}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell key={entry.year} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Result row                                                          */
/* ------------------------------------------------------------------ */

function ResultRow({
  record,
  mode,
  onClick,
}: {
  record: NsrRecord;
  mode: SearchMode;
  onClick: () => void;
}) {
  const meta: string[] = [];
  if (record.pub_year) meta.push(String(record.pub_year));
  if (record.authors) {
    const truncated =
      record.authors.length > 80
        ? record.authors.slice(0, 80) + "…"
        : record.authors;
    meta.push(truncated);
  }
  if (record.reference) meta.push(record.reference);

  return (
    <div
      className="py-3 border-b border-border/10 cursor-pointer hover:bg-muted/30 transition-colors px-1 -mx-1 rounded-sm"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-foreground leading-snug hover:underline flex-1">
          {record.title}
        </span>
        {mode === "semantic" && record.similarity != null && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {(record.similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {meta.length > 0 && (
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
          {meta.join(" · ")}
        </p>
      )}
      {record.doi && (
        <a
          href={`https://doi.org/${record.doi}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground mt-0.5 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          {record.doi}
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Search page                                                         */
/* ------------------------------------------------------------------ */

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(urlQuery);
  const [mode, setMode] = useState<SearchMode>("semantic");
  const [drawerIndex, setDrawerIndex] = useState(-1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Reset filters when query changes
  useEffect(() => {
    setInputValue(urlQuery);
    setFilters(EMPTY_FILTERS);
  }, [urlQuery]);

  const { data, isLoading } = useNsrSearch(urlQuery, mode);
  const records = data?.records ?? [];

  // Apply client-side filters
  const filteredRecords = useMemo(
    () => (hasActiveFilters(filters) ? applyFilters(records, filters) : records),
    [records, filters],
  );

  // Stats computed from ALL results (not filtered) so widgets stay stable
  const yearEntries = useMemo(() => countYears(records), [records]);
  const nuclideEntries = useMemo(
    () => countField(records, (r) => r.nuclides),
    [records],
  );
  const reactionEntries = useMemo(
    () => countField(records, (r) => r.reactions),
    [records],
  );
  const journalEntries = useMemo(() => countJournals(records), [records]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed });
  };

  const handleClear = (val: string) => {
    setInputValue(val);
    if (!val) {
      setSearchParams({});
    }
  };

  // Toggle helpers
  const toggleSet = useCallback(
    (key: "years" | "nuclides" | "reactions" | "journals", value: string) => {
      setFilters((prev) => {
        const next = new Set(prev[key]);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const hasQuery = urlQuery.length >= 3;

  /* ---------- Empty state ---------- */
  if (!hasQuery) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-[720px]">
          <SearchBox
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </div>
    );
  }

  /* ---------- Results state ---------- */
  const hasWidgets =
    yearEntries.length > 0 ||
    nuclideEntries.length > 0 ||
    reactionEntries.length > 0 ||
    journalEntries.length > 0;

  // Find drawer index in filtered records for navigation
  const drawerRecords = filteredRecords;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            <SearchBox
              value={inputValue}
              onChange={handleClear}
              onSubmit={handleSubmit}
              mode={mode}
              onModeChange={setMode}
              isLoading={isLoading}
            />

            {/* Active filters indicator */}
            {hasActiveFilters(filters) && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Filtered: {filteredRecords.length} of {records.length} results
                </span>
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-nuclear hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Count header */}
            <div className="mt-3 mb-2">
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching…</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No results found for &ldquo;{urlQuery}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  About {hasActiveFilters(filters) ? filteredRecords.length : (data?.count ?? records.length)} results
                </p>
              )}
            </div>

            {/* Result list */}
            {!isLoading && filteredRecords.length > 0 && (
              <div>
                {filteredRecords.map((record, i) => (
                  <ResultRow
                    key={record.id}
                    record={record}
                    mode={mode}
                    onClick={() => setDrawerIndex(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right column — widgets in flex wrap grid */}
          {!isLoading && hasWidgets && (
            <div className="w-full lg:w-auto lg:min-w-[280px] lg:max-w-[620px] shrink-0">
              <div className="flex flex-wrap gap-4">
                {/* Year bar chart */}
                <div className="w-full min-w-[222px]">
                  <YearBarChart
                    entries={yearEntries}
                    activeYears={filters.years}
                    onToggle={(v) => toggleSet("years", v)}
                  />
                </div>

                {/* Year table */}
                <div className="flex-1 min-w-[222px] max-w-[300px]">
                  <StatWidget
                    icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                    title="Year"
                    entries={yearEntries}
                    activeValues={filters.years}
                    onToggle={(v) => toggleSet("years", v)}
                  />
                </div>

                {/* Journals */}
                {journalEntries.length > 0 && (
                  <div className="flex-1 min-w-[222px] max-w-[300px]">
                    <StatWidget
                      icon={<BookOpen className="h-3.5 w-3.5 text-muted-foreground" />}
                      title="Journal"
                      entries={journalEntries}
                      activeValues={filters.journals}
                      onToggle={(v) => toggleSet("journals", v)}
                    />
                  </div>
                )}

                {/* Nuclides */}
                {nuclideEntries.length > 0 && (
                  <div className="flex-1 min-w-[222px] max-w-[300px]">
                    <StatWidget
                      icon={<Atom className="h-3.5 w-3.5 text-muted-foreground" />}
                      title="Nuclides"
                      entries={nuclideEntries}
                      activeValues={filters.nuclides}
                      onToggle={(v) => toggleSet("nuclides", v)}
                    />
                  </div>
                )}

                {/* Reactions */}
                {reactionEntries.length > 0 && (
                  <div className="flex-1 min-w-[222px] max-w-[300px]">
                    <StatWidget
                      icon={<Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                      title="Reactions"
                      entries={reactionEntries}
                      activeValues={filters.reactions}
                      onToggle={(v) => toggleSet("reactions", v)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record drawer */}
      <RecordDrawer
        records={drawerRecords}
        currentIndex={drawerIndex}
        open={drawerIndex >= 0}
        onOpenChange={(open) => {
          if (!open) setDrawerIndex(-1);
        }}
        onNavigate={setDrawerIndex}
      />
    </div>
  );
}
