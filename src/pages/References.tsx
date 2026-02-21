import { useState, useDeferredValue, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { NsrRecordCard } from "@/components/NsrRecordCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrSearch } from "@/hooks/useNsrSearch";
import { useNsrRecords } from "@/hooks/useNsrRecords";
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// All years in the database (2000–2026)
const YEAR_OPTIONS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

function getUniqueValues(records: NsrRecord[], field: "reference"): string[] {
  const values = [...new Set(
    records
      .map((r) => r[field])
      .filter((v): v is string => !!v)
  )];
  return values.sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function References() {
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [referenceFilter, setReferenceFilter] = useState<string | null>(null);
  const [authorsSortAsc, setAuthorsSortAsc] = useState<boolean | null>(null);
  const deferredQuery = useDeferredValue(query);

  const search = useNsrSearch(deferredQuery);
  const browse = useNsrRecords({
    year: yearFilter ? Number(yearFilter) : undefined,
  });

  const isSearching = deferredQuery.length >= 3;
  const rawRecords = isSearching ? search.data?.records : browse.data;
  const isLoading = isSearching ? search.isLoading : browse.isLoading;
  const error = isSearching ? search.error : browse.error;

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
          onChange={setQuery}
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
        <FilterDropdown
          label="Reference"
          options={referenceOptions}
          value={referenceFilter}
          onChange={setReferenceFilter}
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
      {records && records.length === 0 && (isSearching || yearFilter || referenceFilter) && (
        <p className="text-center text-muted-foreground py-12">
          No matching records found. Try a different query or clear filters.
        </p>
      )}
    </div>
  );
}
