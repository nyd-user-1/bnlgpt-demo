import { useState, useDeferredValue, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { EndfReportCard } from "@/components/EndfReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEndfReports, type EndfSortField } from "@/hooks/useEndfReports";

const CARDS_PER_PAGE = 99;

export default function Endf() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<EndfSortField>("seq_number");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const deferredQuery = useDeferredValue(query);
  const isSearching = deferredQuery.length >= 3;

  const { data, isLoading, error } = useEndfReports({
    query: isSearching ? deferredQuery : undefined,
    page,
    pageSize: CARDS_PER_PAGE,
    sortBy,
    sortAsc,
  });

  const records = data?.records ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / CARDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  // Reset page when query or sort changes
  useEffect(() => { setPage(1); }, [deferredQuery, sortBy, sortAsc]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSort = (field: EndfSortField) => {
    if (sortBy === field) {
      // Cycle: asc → desc → off
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortBy("seq_number");
        setSortAsc(false);
      }
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const isSortActive = (field: EndfSortField) => sortBy === field;

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

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-3 pb-2">
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

          {/* Date sort toggle */}
          <button
            onClick={() => toggleSort("report_date_parsed")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isSortActive("report_date_parsed")
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Date
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          {/* Report sort toggle */}
          <button
            onClick={() => toggleSort("report_number")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isSortActive("report_number")
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Report
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          {/* Inline pagination (far right) */}
          {totalPages > 0 && (
            <div className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
              <span className="rounded border px-2 py-0.5">{totalCount.toLocaleString()} rows</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
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
        {records && records.length === 0 && isSearching && (
          <p className="text-center text-muted-foreground py-12">
            No matching reports found. Try a different search term.
          </p>
        )}
      </div>
    </div>
  );
}
