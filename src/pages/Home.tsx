import { useState, useDeferredValue } from "react";
import { Header } from "@/components/Header";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";

export default function Home() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery);
  const browse = useNsrRecords();

  const isSearching = deferredQuery.length >= 3;
  const records = isSearching ? search.data?.records : browse.data;
  const isLoading = isSearching ? search.isLoading : browse.isLoading;
  const error = isSearching ? search.error : browse.error;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <SearchInput
            value={query}
            onChange={setQuery}
            isLoading={search.isFetching}
          />
          {isSearching && search.data && (
            <p className="mt-2 text-sm text-muted-foreground">
              {search.data.count} results for "{deferredQuery}"
            </p>
          )}
          {!isSearching && (
            <p className="mt-2 text-sm text-muted-foreground">
              Browse recent NSR records, or type a query to search semantically
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error.message}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}

        {records && records.length > 0 && (
          <div className="space-y-4">
            {records.map((record) => (
              <NsrRecordCard key={record.id} record={record} />
            ))}
          </div>
        )}

        {records && records.length === 0 && isSearching && (
          <p className="text-center text-muted-foreground py-12">
            No matching records found. Try a different query.
          </p>
        )}
      </main>
    </div>
  );
}
