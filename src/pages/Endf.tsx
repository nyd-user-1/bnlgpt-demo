import { useState, useDeferredValue, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";
import { SearchInput } from "@/components/SearchInput";
import { EndfReportCard } from "@/components/EndfReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEndfReports, type EndfSortField } from "@/hooks/useEndfReports";

const CARDS_PER_PAGE = 99;

/* ------------------------------------------------------------------ */
/*  Dropdown filter (same as References page)                          */
/* ------------------------------------------------------------------ */

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}

function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          value
            ? "bg-foreground text-background font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {value ? `${label}: ${value}` : label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] max-h-[280px] overflow-y-auto rounded-lg border bg-background shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Clear filter
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                value === opt
                  ? "bg-muted font-medium text-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ENDF reports span 1965-2020
const YEAR_OPTIONS = Array.from({ length: 56 }, (_, i) => String(2020 - i));

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type SearchMode = "semantic" | "keyword";

export default function Endf() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("semantic");
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<EndfSortField>("seq_number");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const deferredQuery = useDeferredValue(query);
  const isSearching = deferredQuery.length >= 3;

  const { data, isLoading, error } = useEndfReports({
    query: isSearching ? deferredQuery : undefined,
    year: yearFilter ? Number(yearFilter) : undefined,
    page,
    pageSize: CARDS_PER_PAGE,
    sortBy,
    sortAsc,
  });

  const records = data?.records ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / CARDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  // Reset page when query, filter, or sort changes
  useEffect(() => { setPage(1); }, [deferredQuery, yearFilter, searchMode, sortBy, sortAsc]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const defaultSort: EndfSortField = "seq_number";

  const toggleSort = (field: EndfSortField) => {
    if (sortBy === field) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortBy(defaultSort);
        setSortAsc(false);
      }
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const isSortActive = (field: EndfSortField) =>
    sortBy === field && !(field === defaultSort && !sortAsc);

  return (
    <div className="h-full flex flex-col">
      {/* Portal search bar into header */}
      {document.getElementById("header-search") &&
        createPortal(
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search ENDF reports..."
          />,
          document.getElementById("header-search")!
        )}

      {/* Desktop sticky filter bar — hidden on mobile */}
      <div className="hidden md:block sticky top-0 z-10 bg-background px-6 pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Authors sort toggle */}
          <button
            onClick={() => toggleSort("authors")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isSortActive("authors")
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Authors
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          {/* Key # sort toggle */}
          <button
            onClick={() => toggleSort("seq_number")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isSortActive("seq_number")
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Key #
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          {/* Year dropdown */}
          <FilterDropdown
            label="Year"
            options={YEAR_OPTIONS}
            value={yearFilter}
            onChange={setYearFilter}
          />

          {/* Search mode toggle + pagination (far right) */}
          {totalPages > 0 && (
            <div className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {/* Search mode toggle */}
              <div className="inline-flex items-center rounded border text-xs text-muted-foreground overflow-hidden">
                {(["semantic", "keyword"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSearchMode(mode)}
                    className={`px-2 py-0.5 transition-colors ${
                      searchMode === mode
                        ? "bg-muted font-medium text-foreground"
                        : "hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center justify-center h-6 w-6 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>Page</span>
              <input
                type="text"
                value={currentPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= totalPages) goToPage(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Number((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= totalPages) goToPage(val);
                  }
                }}
                className="h-6 w-10 rounded border bg-transparent text-center text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <span>of {totalPages}</span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center justify-center h-6 w-6 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile pagination + search mode — visible only on mobile */}
      {totalPages > 0 && (
        <div className="md:hidden sticky top-0 z-10 bg-background px-3 pt-3 pb-2">
          <div className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
            {/* Search mode toggle */}
            <div className="inline-flex items-center rounded border text-xs text-muted-foreground overflow-hidden">
              {(["semantic", "keyword"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSearchMode(mode)}
                  className={`px-2 py-0.5 transition-colors ${
                    searchMode === mode
                      ? "bg-muted font-medium text-foreground"
                      : "hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center justify-center h-6 w-6 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>Page</span>
              <input
                type="text"
                value={currentPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= totalPages) goToPage(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Number((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= totalPages) goToPage(val);
                  }
                }}
                className="h-6 w-10 rounded border bg-transparent text-center text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <span>of {totalPages}</span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center justify-center h-6 w-6 rounded border hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB + drawer filters */}
      <MobileFilterDrawer>
        {/* Authors sort toggle */}
        <button
          onClick={() => toggleSort("authors")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isSortActive("authors")
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Authors
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* Key # sort toggle */}
        <button
          onClick={() => toggleSort("seq_number")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isSortActive("seq_number")
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Key #
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* Year dropdown */}
        <FilterDropdown
          label="Year"
          options={YEAR_OPTIONS}
          value={yearFilter}
          onChange={setYearFilter}
        />

        {/* Search mode toggle */}
        <div className="inline-flex items-center rounded border text-xs text-muted-foreground overflow-hidden">
          {(["semantic", "keyword"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              className={`px-2 py-0.5 transition-colors ${
                searchMode === mode
                  ? "bg-muted font-medium text-foreground"
                  : "hover:bg-muted hover:text-foreground"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </MobileFilterDrawer>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            {error.message}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-muted/40 p-6 min-h-[280px] space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {records && records.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {records.map((report) => (
              <EndfReportCard
                key={report.id}
                report={report}
                searchQuery={isSearching ? deferredQuery : undefined}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {records && records.length === 0 && (isSearching || yearFilter) && (
          <p className="text-center text-muted-foreground py-12">
            No matching reports found. Try a different search term.
          </p>
        )}
      </div>

    </div>
  );
}
