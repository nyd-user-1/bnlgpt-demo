import { useState, useDeferredValue, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { NuclideCombobox } from "@/components/NuclideCombobox";
import { ReactionCombobox } from "@/components/ReactionCombobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";
import { useNsrStructuredSearch } from "@/hooks/useNsrStructuredSearch";
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
/*  Text filter input (inline, submit on Enter)                        */
/* ------------------------------------------------------------------ */

interface TextFilterProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function TextFilter({ label, placeholder, value, onChange, onSubmit }: TextFilterProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={placeholder}
        className="bg-transparent text-sm w-24 outline-none placeholder:text-muted-foreground/50"
      />
      <button
        onClick={onSubmit}
        className="text-muted-foreground hover:text-foreground"
        title="Search"
      >
        <Search className="h-3 w-3" />
      </button>
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
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [authorsSortAsc, setAuthorsSortAsc] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);

  // Structured search inputs
  const [nuclideInput, setNuclideInput] = useState("");
  const [reactionInput, setReactionInput] = useState("");
  const [zMinInput, setZMinInput] = useState("");
  const [zMaxInput, setZMaxInput] = useState("");
  const [structuredParams, setStructuredParams] = useState<{
    nuclides?: string[];
    reactions?: string[];
    zMin?: number;
    zMax?: number;
  } | null>(null);

  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery);
  const browse = useNsrRecords({
    year: yearFilter ? Number(yearFilter) : undefined,
    page,
    pageSize: CARDS_PER_PAGE,
  });
  const structured = useNsrStructuredSearch(structuredParams);

  const clearStructuredSearch = () => {
    setStructuredParams(null);
    setNuclideInput("");
    setReactionInput("");
    setZMinInput("");
    setZMaxInput("");
  };

  const handleStructuredSearch = (overrides?: { nuclide?: string; reaction?: string }) => {
    const nuc = overrides?.nuclide ?? nuclideInput;
    const rxn = overrides?.reaction ?? reactionInput;
    const nuclides = nuc.trim() ? [nuc.trim()] : [];
    const reactions = rxn.trim() ? [rxn.trim()] : [];
    const zMin = zMinInput ? Number(zMinInput) : undefined;
    const zMax = zMaxInput ? Number(zMaxInput) : undefined;

    if (nuclides.length === 0 && reactions.length === 0 && zMin == null && zMax == null) {
      clearStructuredSearch();
      return;
    }

    // Clear text search when using structured search
    setQuery("");
    setPage(1);
    setStructuredParams({
      nuclides: nuclides.length > 0 ? nuclides : undefined,
      reactions: reactions.length > 0 ? reactions : undefined,
      zMin,
      zMax,
    });
  };

  // Auto-clear structured search when all inputs are emptied via backspace
  const handleNuclideChange = (v: string) => {
    setNuclideInput(v);
    if (!v && !reactionInput && !zMinInput && !zMaxInput && structuredParams) {
      setStructuredParams(null);
    }
  };
  const handleReactionChange = (v: string) => {
    setReactionInput(v);
    if (!nuclideInput && !v && !zMinInput && !zMaxInput && structuredParams) {
      setStructuredParams(null);
    }
  };
  const handleZMinChange = (v: string) => {
    setZMinInput(v);
    if (!nuclideInput && !reactionInput && !v && !zMaxInput && structuredParams) {
      setStructuredParams(null);
    }
  };
  const handleZMaxChange = (v: string) => {
    setZMaxInput(v);
    if (!nuclideInput && !reactionInput && !zMinInput && !v && structuredParams) {
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

    return filtered;
  }, [rawRecords, authorsSortAsc]);

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
      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-10 bg-background px-6 pt-6 pb-2">
        {/* Search bar */}
        <div className="mb-4">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              if (v.length >= 3) clearStructuredSearch();
            }}
            isLoading={search.isFetching}
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Z range filter */}
          <TextFilter
            label="Z min"
            placeholder="e.g. 6"
            value={zMinInput}
            onChange={handleZMinChange}
            onSubmit={handleStructuredSearch}
          />
          <TextFilter
            label="Z max"
            placeholder="e.g. 28"
            value={zMaxInput}
            onChange={handleZMaxChange}
            onSubmit={handleStructuredSearch}
          />

          <FilterDropdown
            label="Year"
            options={YEAR_OPTIONS}
            value={yearFilter}
            onChange={setYearFilter}
          />
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
              <NsrRecordCard key={record.id} record={record} />
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
    </div>
  );
}
