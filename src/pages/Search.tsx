import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Calendar, Atom, Zap, ExternalLink } from "lucide-react";
import { useNsrSearch, type SearchMode } from "@/hooks/useNsrSearch";
import { SearchInput } from "@/components/SearchInput";
import { RecordDrawer } from "@/components/RecordDrawer";
import type { NsrRecord } from "@/types/nsr";

/* ------------------------------------------------------------------ */
/*  Stat helpers                                                        */
/* ------------------------------------------------------------------ */

interface CountEntry {
  value: string;
  count: number;
}

function countField(records: NsrRecord[], getter: (r: NsrRecord) => string[] | null | undefined): CountEntry[] {
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
    (a, b) => Number(b.value) - Number(a.value),
  );
}

/* ------------------------------------------------------------------ */
/*  StatWidget                                                          */
/* ------------------------------------------------------------------ */

const MAX_WIDGET_ROWS = 8;

function StatWidget({
  icon,
  title,
  entries,
}: {
  icon: React.ReactNode;
  title: string;
  entries: CountEntry[];
}) {
  if (entries.length === 0) return null;

  const visible = entries.slice(0, MAX_WIDGET_ROWS);
  const remaining = entries.length - visible.length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        {icon}
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="divide-y divide-border/30">
        {visible.map((e) => (
          <div key={e.value} className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-foreground truncate mr-2">{e.value}</span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {e.count}
            </span>
          </div>
        ))}
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
      {/* Row 1: Title + similarity badge */}
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

      {/* Row 2: Metadata */}
      {meta.length > 0 && (
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
          {meta.join(" · ")}
        </p>
      )}

      {/* Row 3: DOI */}
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

  // Sync input when URL changes (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const { data, isLoading } = useNsrSearch(urlQuery, mode);
  const records = data?.records ?? [];

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

  // Statistics computed from results
  const yearEntries = useMemo(() => countYears(records), [records]);
  const nuclideEntries = useMemo(
    () => countField(records, (r) => r.nuclides),
    [records],
  );
  const reactionEntries = useMemo(
    () => countField(records, (r) => r.reactions),
    [records],
  );

  const hasQuery = urlQuery.length >= 3;

  /* ---------- Empty state ---------- */
  if (!hasQuery) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center">
          Search Nuclear Science References
        </h1>
        <div className="w-full max-w-[720px]">
          <SearchInput
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
    reactionEntries.length > 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1060px] px-4 py-6">
        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column */}
          <div className="flex-1 min-w-0 md:max-w-[650px]">
            {/* Search input */}
            <SearchInput
              value={inputValue}
              onChange={handleClear}
              onSubmit={handleSubmit}
              mode={mode}
              onModeChange={setMode}
              isLoading={isLoading}
            />

            {/* Count header */}
            <div className="mt-4 mb-2">
              {isLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching…</span>
                </div>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No results found for &ldquo;{urlQuery}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  About {data?.count ?? records.length} results
                </p>
              )}
            </div>

            {/* Result list */}
            {!isLoading && records.length > 0 && (
              <div>
                {records.map((record, i) => (
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

          {/* Right column — stat widgets */}
          {!isLoading && hasWidgets && (
            <div className="w-full md:w-[340px] shrink-0 flex flex-col gap-4">
              <StatWidget
                icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                title="Year"
                entries={yearEntries}
              />
              <StatWidget
                icon={<Atom className="h-3.5 w-3.5 text-muted-foreground" />}
                title="Nuclides"
                entries={nuclideEntries}
              />
              <StatWidget
                icon={<Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                title="Reactions"
                entries={reactionEntries}
              />
            </div>
          )}
        </div>
      </div>

      {/* Record drawer */}
      <RecordDrawer
        records={records}
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
