import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { useNsrSearch, type SearchMode } from "@/hooks/useNsrSearch";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { RecordDrawer } from "@/components/RecordDrawer";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed });
  };

  const hasQuery = urlQuery.length >= 3;

  // Empty state — centered heading + search input
  if (!hasQuery) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center">
          Search Nuclear Science References
        </h1>
        <form onSubmit={handleSubmit} className="w-full max-w-[600px]">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search by topic, author, nuclide..."
              autoFocus
              className="w-full rounded-xl border border-border bg-muted/40 py-3.5 pl-12 pr-4 text-base outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground/60"
            />
          </div>
        </form>
      </div>
    );
  }

  // Results state
  return (
    <div className="flex h-full flex-col">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-4 py-3">
        <div className="mx-auto max-w-[1200px] flex items-center gap-3">
          <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search by topic, author, nuclide..."
                className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground/60"
              />
            </div>
          </form>
          <div className="flex items-center rounded-lg border border-border text-xs">
            <button
              onClick={() => setMode("semantic")}
              className={`px-3 py-1.5 rounded-l-lg transition-colors ${
                mode === "semantic"
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semantic
            </button>
            <button
              onClick={() => setMode("keyword")}
              className={`px-3 py-1.5 rounded-r-lg transition-colors ${
                mode === "keyword"
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Keyword
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-[1200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">
              No results found for "{urlQuery}"
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {records.map((record, i) => (
                <NsrRecordCard
                  key={record.id}
                  record={record}
                  searchQuery={urlQuery}
                  searchMode={mode}
                  onClick={() => setDrawerIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record drawer */}
      <RecordDrawer
        records={records}
        currentIndex={drawerIndex}
        open={drawerIndex >= 0}
        onOpenChange={(open) => { if (!open) setDrawerIndex(-1); }}
        onNavigate={setDrawerIndex}
      />
    </div>
  );
}
