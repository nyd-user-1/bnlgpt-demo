import { useState, useDeferredValue, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { EndfReportCard } from "@/components/EndfReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEndfReports } from "@/hooks/useEndfReports";

const CARDS_PER_PAGE = 99;

export default function Endf() {
  const [query, setQuery] = useState("");
  const [authorsSortAsc, setAuthorsSortAsc] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);

  const deferredQuery = useDeferredValue(query);
  const isSearching = deferredQuery.length >= 3;

  const { data, isLoading, error } = useEndfReports({
    query: isSearching ? deferredQuery : undefined,
    page,
    pageSize: CARDS_PER_PAGE,
  });

  // Apply authors sort client-side
  const records = useMemo(() => {
    if (!data?.records) return null;
    if (authorsSortAsc === null) return data.records;
    return [...data.records].sort((a, b) => {
      const aa = a.authors ?? "";
      const ab = b.authors ?? "";
      return authorsSortAsc ? aa.localeCompare(ab) : ab.localeCompare(aa);
    });
  }, [data?.records, authorsSortAsc]);

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / CARDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  // Reset page when query changes
  useEffect(() => { setPage(1); }, [deferredQuery]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const goToPage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            onClick={() =>
              setAuthorsSortAsc((prev) =>
                prev === null ? true : prev ? false : null
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              authorsSortAsc !== null
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Authors
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
