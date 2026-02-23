import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

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

  const selected = ELEMENT_RANGES.find((r) => r.value === value);

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
        {selected ? `Range: ${selected.label}` : "Range"}
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
          {ELEMENT_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => { onChange(range.value); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                value === range.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
