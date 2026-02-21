import { useState, useDeferredValue } from "react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";

const FILTER_TABS = ["Year", "Reference", "Keywords", "Authors"] as const;

export default function References() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery);
  const browse = useNsrRecords();

  const isSearching = deferredQuery.length >= 3;
  const records = isSearching ? search.data?.records : browse.data;
  const isLoading = isSearching ? search.isLoading : browse.isLoading;
  const error = isSearching ? search.error : browse.error;

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

      {/* Filter tabs */}
      <div className="mb-6 flex gap-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tab}
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
