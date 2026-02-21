import { useState, useDeferredValue, useMemo } from "react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";
import type { NsrRecord } from "@/types/nsr";

type SortField = "year" | "reference" | "keywords" | "authors";

const FILTER_TABS: { label: string; field: SortField }[] = [
  { label: "Year", field: "year" },
  { label: "Reference", field: "reference" },
  { label: "Keywords", field: "keywords" },
  { label: "Authors", field: "authors" },
];

function sortRecords(records: NsrRecord[], field: SortField): NsrRecord[] {
  return [...records].sort((a, b) => {
    switch (field) {
      case "year":
        return b.pub_year - a.pub_year;
      case "reference": {
        const ra = a.reference ?? "";
        const rb = b.reference ?? "";
        return ra.localeCompare(rb);
      }
      case "keywords": {
        const ka = a.keywords ?? "";
        const kb = b.keywords ?? "";
        // Records with keywords first, then alphabetical
        if (ka && !kb) return -1;
        if (!ka && kb) return 1;
        return ka.localeCompare(kb);
      }
      case "authors": {
        const aa = a.authors ?? "";
        const ab = b.authors ?? "";
        return aa.localeCompare(ab);
      }
      default:
        return 0;
    }
  });
}

export default function References() {
  const [query, setQuery] = useState("");
  const [activeSort, setActiveSort] = useState<SortField | null>(null);
  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery);
  const browse = useNsrRecords();

  const isSearching = deferredQuery.length >= 3;
  const rawRecords = isSearching ? search.data?.records : browse.data;
  const isLoading = isSearching ? search.isLoading : browse.isLoading;
  const error = isSearching ? search.error : browse.error;

  const records = useMemo(() => {
    if (!rawRecords) return null;
    if (!activeSort) return rawRecords;
    return sortRecords(rawRecords, activeSort);
  }, [rawRecords, activeSort]);

  return (
    <div className="px-6 py-6">
      {/* Search bar */}
      <div className="mb-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          isLoading={search.isFetching}
        />
      </div>

      {/* Filter/sort tabs */}
      <div className="mb-6 flex gap-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.field}
            onClick={() =>
              setActiveSort((prev) =>
                prev === tab.field ? null : tab.field
              )
            }
            className={`text-sm transition-colors ${
              activeSort === tab.field
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Results grid */}
      {records && records.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => (
            <NsrRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {records && records.length === 0 && isSearching && (
        <p className="text-center text-muted-foreground py-12">
          No matching records found. Try a different query.
        </p>
      )}
    </div>
  );
}
