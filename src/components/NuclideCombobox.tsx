import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NuclideComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (overrides?: { nuclide?: string }) => void;
}

/** Normalize user nuclide input: "o-16" → "16O", "pb208" → "208Pb" */
function normalizeNuclide(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  // Already in ASymbol form: "16O"
  const m1 = s.match(/^(\d+)([A-Za-z]{1,2})$/);
  if (m1) return `${m1[1]}${m1[2][0].toUpperCase()}${m1[2].slice(1).toLowerCase()}`;
  // Symbol-first: "O16", "Pb208", "O-16", "Pb-208"
  const m2 = s.match(/^([A-Za-z]{1,2})[-]?(\d+)$/);
  if (m2) return `${m2[2]}${m2[1][0].toUpperCase()}${m2[1].slice(1).toLowerCase()}`;
  return s;
}

async function fetchNuclides(): Promise<string[]> {
  const { data, error } = await supabase
    .from("distinct_nuclides")
    .select("value")
    .order("value", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { value: string }) => r.value);
}

export function NuclideCombobox({ value, onChange, onSubmit }: NuclideComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: nuclides = [] } = useQuery({
    queryKey: ["distinct-nuclides"],
    queryFn: fetchNuclides,
    staleTime: 1000 * 60 * 30,
  });

  // Filter nuclides based on input
  const filtered = useMemo(() => {
    if (!inputValue.trim()) return nuclides;
    const normalized = normalizeNuclide(inputValue).toLowerCase();
    const raw = inputValue.toLowerCase().trim();
    return nuclides.filter((n) => {
      const lower = n.toLowerCase();
      return lower.includes(normalized) || lower.includes(raw);
    });
  }, [nuclides, inputValue]);

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

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const selectNuclide = (nuclide: string) => {
    onChange(nuclide);
    setInputValue(nuclide);
    setOpen(false);
    onSubmit({ nuclide });
  };

  const clearSelection = () => {
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleInputChange = (v: string) => {
    setInputValue(v);
    setOpen(true);
    onChange(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // If there's an exact match in the list, select it
      const normalized = normalizeNuclide(inputValue);
      const exactMatch = nuclides.find(
        (n) => n.toLowerCase() === normalized.toLowerCase()
      );
      if (exactMatch) {
        selectNuclide(exactMatch);
      } else {
        setOpen(false);
        onSubmit({ nuclide: inputValue });
      }
    }
    if (e.key === "Escape") {
      if (open) {
        setOpen(false);
      } else {
        clearSelection();
      }
    }
  };

  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape" && value && !open) {
          e.preventDefault();
          clearSelection();
        }
      }}
    >
      <div className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1">
        <span className="text-xs text-muted-foreground font-medium">Nuclide</span>

        {/* Show selected value as a pill, or show input */}
        {value && !open ? (
          <button
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") clearSelection();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground"
          >
            {value}
          </button>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 6He"
            className="bg-transparent text-sm w-24 outline-none placeholder:text-muted-foreground/50"
          />
        )}

        {value ? (
          <button
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[240px] max-h-[240px] overflow-y-auto rounded-lg border bg-background shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No nuclides found.</div>
          ) : (
            filtered.map((nuclide) => (
              <button
                key={nuclide}
                onClick={() => selectNuclide(nuclide)}
                className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                  value === nuclide ? "bg-muted font-medium" : ""
                }`}
              >
                <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
                  {nuclide}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
