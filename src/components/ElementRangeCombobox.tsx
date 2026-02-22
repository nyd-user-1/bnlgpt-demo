import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

const ELEMENT_RANGES = [
  { label: "Light (Z 1–20)", value: "1-20" },
  { label: "Medium (Z 21–50)", value: "21-50" },
  { label: "Heavy (Z 51–82)", value: "51-82" },
  { label: "Actinides (Z 89–103)", value: "89-103" },
  { label: "Superheavy (Z 104–118)", value: "104-118" },
];

interface ElementRangeComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ElementRangeCombobox({ value, onChange }: ElementRangeComboboxProps) {
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

  // Escape clears selection (document-level)
  useEffect(() => {
    if (!value) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onChange(null);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [value, onChange]);

  const selected = ELEMENT_RANGES.find((r) => r.value === value);

  return (
    <div className="relative" ref={ref}>
      <div className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1">
        <span className="text-xs text-muted-foreground font-medium">Range</span>

        {selected && !open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground"
          >
            Z {selected.value}
          </button>
        ) : (
          <span
            onClick={() => setOpen(!open)}
            className="w-24 text-sm text-muted-foreground/50 cursor-pointer"
          >
            e.g. Light
          </span>
        )}

        {selected ? (
          <button
            onClick={() => onChange(null)}
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
          {ELEMENT_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => {
                onChange(range.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                value === range.value ? "bg-muted font-medium" : ""
              }`}
            >
              <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
                {range.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
