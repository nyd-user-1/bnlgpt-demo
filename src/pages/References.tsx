import { useState, useDeferredValue, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { NuclideCombobox } from "@/components/NuclideCombobox";
import { ReactionCombobox } from "@/components/ReactionCombobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch, type SearchMode } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";
import { useNsrStructuredSearch } from "@/hooks/useNsrStructuredSearch";
import { useFeedEmitter } from "@/hooks/useFeedEmitter";
import { RecordDrawer } from "@/components/RecordDrawer";
import type { NsrRecord } from "@/types/nsr";

const CARDS_PER_PAGE = 99;

/* ------------------------------------------------------------------ */
/*  Dropdown filter component                                          */
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

  // Close on outside click
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
          {/* Clear option */}
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// All years in the database (2000-2026)
const YEAR_OPTIONS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function References() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params (from feed item clicks)
  const initialQ = searchParams.get("q") ?? "";
  const initialMode = (searchParams.get("mode") as SearchMode) || "semantic";
  const initialNuclide = searchParams.get("nuclide") ?? "";
  const initialReaction = searchParams.get("reaction") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [authorsSortAsc, setAuthorsSortAsc] = useState<boolean | null>(null);
  const [keySortAsc, setKeySortAsc] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);

  // Structured search inputs
  // Record detail drawer
  const [drawerIndex, setDrawerIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [nuclideInput, setNuclideInput] = useState(initialNuclide);
  const [reactionInput, setReactionInput] = useState(initialReaction);
  const [structuredParams, setStructuredParams] = useState<{
    nuclides?: string[];
    reactions?: string[];
  } | null>(() => {
    // Initialize structured params from URL if present
    const nuclides = initialNuclide ? [initialNuclide] : [];
    const reactions = initialReaction ? [initialReaction] : [];
    if (nuclides.length > 0 || reactions.length > 0) {
      return {
        nuclides: nuclides.length > 0 ? nuclides : undefined,
        reactions: reactions.length > 0 ? reactions : undefined,
      };
    }
    return null;
  });

  // React to URL param changes (from feed item clicks while already on /references)
  const paramKey = searchParams.toString();
  useEffect(() => {
    if (!paramKey) return;
    const q = searchParams.get("q") ?? "";
    const mode = (searchParams.get("mode") as SearchMode) || "semantic";
    const nuclide = searchParams.get("nuclide") ?? "";
    const reaction = searchParams.get("reaction") ?? "";

    // Apply search params
    if (q) {
      setQuery(q);
      setSearchMode(mode);
      setNuclideInput("");
      setReactionInput("");
      setStructuredParams(null);
    } else {
      setQuery("");
      setNuclideInput(nuclide);
      setReactionInput(reaction);
      const nuclides = nuclide ? [nuclide] : [];
      const reactions = reaction ? [reaction] : [];
      if (nuclides.length > 0 || reactions.length > 0) {
        setStructuredParams({
          nuclides: nuclides.length > 0 ? nuclides : undefined,
          reactions: reactions.length > 0 ? reactions : undefined,
        });
      }
    }
    setPage(1);

    // Clear URL params after applying
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery, searchMode);
  const browse = useNsrRecords({
    year: yearFilter ? Number(yearFilter) : undefined,
    page,
    pageSize: CARDS_PER_PAGE,
  });
  const structured = useNsrStructuredSearch(structuredParams);

  // Feed emitter
  const { emit } = useFeedEmitter();
  const prevSearchQueryRef = useRef<string>("");
  const prevStructuredRef = useRef<string>("");

  // Emit semantic/keyword search events
  useEffect(() => {
    if (!search.data || !deferredQuery || deferredQuery.length < 3) return;
    if (deferredQuery === prevSearchQueryRef.current) return;
    prevSearchQueryRef.current = deferredQuery;
    emit({
      event_type: searchMode === "semantic" ? "semantic_search" : "keyword_search",
      category: "search",
      entity_type: "query",
      entity_value: deferredQuery,
      display_text: `Searched "${deferredQuery}"`,
    });
  }, [search.data, deferredQuery, searchMode, emit]);

  // Emit structured filter events
  useEffect(() => {
    if (!structured.data || !structuredParams) return;
    const key = JSON.stringify(structuredParams);
    if (key === prevStructuredRef.current) return;
    prevStructuredRef.current = key;

    if (structuredParams.nuclides?.length) {
      emit({
        event_type: "nuclide_filter",
        category: "search",
        entity_type: "nuclide",
        entity_value: structuredParams.nuclides.join(", "),
        display_text: `Filtered by nuclide ${structuredParams.nuclides.join(", ")}`,
      });
    }
    if (structuredParams.reactions?.length) {
      emit({
        event_type: "reaction_filter",
        category: "search",
        entity_type: "reaction",
        entity_value: structuredParams.reactions.join(", "),
        display_text: `Filtered by reaction ${structuredParams.reactions.join(", ")}`,
      });
    }
  }, [structured.data, structuredParams, emit]);

  const clearStructuredSearch = () => {
    setStructuredParams(null);
    setNuclideInput("");
    setReactionInput("");
  };

  const handleStructuredSearch = (overrides?: { nuclide?: string; reaction?: string }) => {
    const nuc = overrides?.nuclide ?? nuclideInput;
    const rxn = overrides?.reaction ?? reactionInput;
    const nuclides = nuc.trim() ? [nuc.trim()] : [];
    const reactions = rxn.trim() ? [rxn.trim()] : [];

    if (nuclides.length === 0 && reactions.length === 0) {
      clearStructuredSearch();
      return;
    }

    // Clear text search when using structured search
    setQuery("");
    setPage(1);
    setStructuredParams({
      nuclides: nuclides.length > 0 ? nuclides : undefined,
      reactions: reactions.length > 0 ? reactions : undefined,
    });
  };

  // Auto-clear structured search when all inputs are emptied
  const handleNuclideChange = (v: string) => {
    setNuclideInput(v);
    if (!v && !reactionInput && structuredParams) {
      setStructuredParams(null);
    }
  };
  const handleReactionChange = (v: string) => {
    setReactionInput(v);
    if (!nuclideInput && !v && structuredParams) {
      setStructuredParams(null);
    }
  };

  const isSearching = deferredQuery.length >= 3;
  const isStructured = structuredParams !== null;

  // Determine which data source to show
  let rawRecords: NsrRecord[] | null | undefined;
  let isLoading: boolean;
  let error: Error | null;
  let browseTotalCount = 0;

  if (isStructured) {
    rawRecords = structured.data;
    isLoading = structured.isLoading;
    error = structured.error;
  } else if (isSearching) {
    rawRecords = search.data?.records;
    isLoading = search.isLoading;
    error = search.error;
  } else {
    rawRecords = browse.data?.records;
    isLoading = browse.isLoading;
    error = browse.error;
    browseTotalCount = browse.data?.totalCount ?? 0;
  }

  // Apply sort
  const records = useMemo(() => {
    if (!rawRecords) return null;
    let filtered = rawRecords;

    if (authorsSortAsc !== null) {
      filtered = [...filtered].sort((a, b) => {
        const aa = a.authors ?? "";
        const ab = b.authors ?? "";
        return authorsSortAsc ? aa.localeCompare(ab) : ab.localeCompare(aa);
      });
    }

    if (keySortAsc !== null) {
      filtered = [...filtered].sort((a, b) => {
        return keySortAsc
          ? a.key_number.localeCompare(b.key_number)
          : b.key_number.localeCompare(a.key_number);
      });
    }

    return filtered;
  }, [rawRecords, authorsSortAsc, keySortAsc]);

  // Pagination — server-side for browse, client-side for search/structured
  const isBrowsing = !isSearching && !isStructured;
  const totalRecords = isBrowsing ? browseTotalCount : (records?.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRecords / CARDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  // For search/structured, slice client-side. For browse, records are already paged from server.
  const pagedRecords = useMemo(() => {
    if (!records) return null;
    if (isBrowsing) return records;
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return records.slice(start, start + CARDS_PER_PAGE);
  }, [records, currentPage, isBrowsing]);

  // Reset page when data source changes
  useEffect(() => { setPage(1); }, [deferredQuery, yearFilter, structuredParams]);

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
            onChange={(v) => {
              setQuery(v);
              if (v.length >= 3) clearStructuredSearch();
            }}
            isLoading={search.isFetching}
          />,
          document.getElementById("header-search")!
        )}

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-3 pb-2">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Authors sort toggle */}
          <button
            onClick={() => {
              setAuthorsSortAsc((prev) =>
                prev === null ? true : prev ? false : null
              );
              setKeySortAsc(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              authorsSortAsc !== null
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Authors
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          {/* Key # sort toggle */}
          <button
            onClick={() => {
              setKeySortAsc((prev) =>
                prev === null ? true : prev ? false : null
              );
              setAuthorsSortAsc(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              keySortAsc !== null
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Key #
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          <FilterDropdown
            label="Year"
            options={YEAR_OPTIONS}
            value={yearFilter}
            onChange={setYearFilter}
          />

          {/* Nuclide filter */}
          <NuclideCombobox
            value={nuclideInput}
            onChange={handleNuclideChange}
            onSubmit={handleStructuredSearch}
          />

          {/* Reaction filter */}
          <ReactionCombobox
            value={reactionInput}
            onChange={handleReactionChange}
            onSubmit={handleStructuredSearch}
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

          {/* Clear structured filters */}
          {isStructured && (
            <button
              onClick={clearStructuredSearch}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear nuclide/reaction filters
            </button>
          )}

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
              <span className="rounded border px-2 py-0.5">{totalRecords.toLocaleString()} rows</span>
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
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {pagedRecords && pagedRecords.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pagedRecords.map((record) => (
              <NsrRecordCard
                key={record.id}
                record={record}
                searchQuery={isSearching ? deferredQuery : undefined}
                searchMode={searchMode}
                onClick={() => {
                  const idx = pagedRecords?.indexOf(record) ?? 0;
                  setDrawerIndex(idx);
                  setDrawerOpen(true);
                }}
              />
            ))}
          </div>
        )}


        {/* Empty state */}
        {records && records.length === 0 && (isSearching || isStructured || yearFilter) && (
          <p className="text-center text-muted-foreground py-12">
            No matching records found. Try a different query or clear filters.
          </p>
        )}
      </div>

      <RecordDrawer
        records={pagedRecords ?? []}
        currentIndex={drawerIndex}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onNavigate={setDrawerIndex}
      />
    </div>
  );
}
