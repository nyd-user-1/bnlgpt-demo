import { useState, useDeferredValue, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";
import { useNsrStructuredSearch } from "@/hooks/useNsrStructuredSearch";
import type { NsrRecord } from "@/types/nsr";

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

function getUniqueValues(records: NsrRecord[], field: "reference"): string[] {
  const values = [...new Set(
    records
      .map((r) => r[field])
      .filter((v): v is string => !!v)
  )];
  return values.sort((a, b) => a.localeCompare(b));
}

/** Normalize user nuclide input: "o-16" → "16O", "pb208" → "208Pb" */
function normalizeNuclide(raw: string): string {
  const s = raw.trim();
  // Already in ASymbol form: "16O"
  const m1 = s.match(/^(\d+)([A-Za-z]{1,2})$/);
  if (m1) return `${m1[1]}${m1[2][0].toUpperCase()}${m1[2].slice(1).toLowerCase()}`;
  // Symbol-first: "O16", "Pb208"
  const m2 = s.match(/^([A-Za-z]{1,2})[-]?(\d+)$/);
  if (m2) return `${m2[2]}${m2[1][0].toUpperCase()}${m2[1].slice(1).toLowerCase()}`;
  return s;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function References() {
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [referenceFilter, setReferenceFilter] = useState<string | null>(null);
  const [authorsSortAsc, setAuthorsSortAsc] = useState<boolean | null>(null);

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
  });
  const structured = useNsrStructuredSearch(structuredParams);

  const clearStructuredSearch = () => {
    setStructuredParams(null);
    setNuclideInput("");
    setReactionInput("");
    setZMinInput("");
    setZMaxInput("");
  };

  const handleStructuredSearch = () => {
    const nuclides = nuclideInput
      .split(/[,;\s]+/)
      .map(normalizeNuclide)
      .filter(Boolean);
    const reactions = reactionInput
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const zMin = zMinInput ? Number(zMinInput) : undefined;
    const zMax = zMaxInput ? Number(zMaxInput) : undefined;

    if (nuclides.length === 0 && reactions.length === 0 && zMin == null && zMax == null) {
      clearStructuredSearch();
      return;
    }

    // Clear text search when using structured search
    setQuery("");
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

  if (isStructured) {
    rawRecords = structured.data;
    isLoading = structured.isLoading;
    error = structured.error;
  } else if (isSearching) {
    rawRecords = search.data?.records;
    isLoading = search.isLoading;
    error = search.error;
  } else {
    rawRecords = browse.data;
    isLoading = browse.isLoading;
    error = browse.error;
  }

  // Extract unique reference values from loaded records
  const allRecords = browse.data ?? [];
  const referenceOptions = useMemo(() => getUniqueValues(allRecords, "reference"), [allRecords]);

  // Apply filters + sort
  const records = useMemo(() => {
    if (!rawRecords) return null;
    let filtered = rawRecords;

    if (referenceFilter) {
      filtered = filtered.filter((r) => r.reference === referenceFilter);
    }
    if (authorsSortAsc !== null) {
      filtered = [...filtered].sort((a, b) => {
        const aa = a.authors ?? "";
        const ab = b.authors ?? "";
        return authorsSortAsc ? aa.localeCompare(ab) : ab.localeCompare(aa);
      });
    }

    return filtered;
  }, [rawRecords, referenceFilter, authorsSortAsc]);

  return (
    <div className="px-6 py-6 h-full overflow-y-auto">
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
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

        {/* Nuclide filter */}
        <TextFilter
          label="Nuclide"
          placeholder="e.g. 6He"
          value={nuclideInput}
          onChange={handleNuclideChange}
          onSubmit={handleStructuredSearch}
        />

        {/* Reaction filter */}
        <TextFilter
          label="Reaction"
          placeholder="e.g. (p,n)"
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

        {/* Clear structured filters */}
        {isStructured && (
          <button
            onClick={clearStructuredSearch}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear nuclide/reaction filters
          </button>
        )}
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
      {records && records.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => (
            <NsrRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {records && records.length === 0 && (isSearching || isStructured || yearFilter || referenceFilter) && (
        <p className="text-center text-muted-foreground py-12">
          No matching records found. Try a different query or clear filters.
        </p>
      )}
    </div>
  );
}
