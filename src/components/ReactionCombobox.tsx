import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReactionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (overrides?: { reaction?: string }) => void;
}

/** Strip parentheses for display: "(p,n)" → "p,n" */
function stripParens(s: string): string {
  return s.replace(/^\(/, "").replace(/\)$/, "");
}

/** Normalize input for matching: strip parens and lowercase */
function normalize(s: string): string {
  return stripParens(s).toLowerCase().trim();
}

async function fetchReactions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("distinct_reactions")
    .select("value")
    .order("value", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { value: string }) => r.value);
}

export function ReactionCombobox({ value, onChange, onSubmit }: ReactionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ? stripParens(value) : "");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: reactions = [] } = useQuery({
    queryKey: ["distinct-reactions"],
    queryFn: fetchReactions,
    staleTime: 1000 * 60 * 30,
  });

  // Filter reactions based on input
  const filtered = useMemo(() => {
    if (!inputValue.trim()) return reactions;
    const query = normalize(inputValue);
    return reactions.filter((r) => normalize(r).includes(query));
  }, [reactions, inputValue]);

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
    setInputValue(value ? stripParens(value) : "");
  }, [value]);

  const selectReaction = (reaction: string) => {
    onChange(reaction);
    setInputValue(stripParens(reaction));
    setOpen(false);
    onSubmit({ reaction });
  };

  const clearSelection = () => {
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleInputChange = (v: string) => {
    setInputValue(v);
    setOpen(true);
    // Update the parent with the raw input (we'll wrap in parens for search)
    onChange(v ? `(${v})` : "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // If there's an exact match in the list, select it
      const exactMatch = reactions.find(
        (r) => normalize(r) === normalize(inputValue)
      );
      if (exactMatch) {
        selectReaction(exactMatch);
      } else {
        setOpen(false);
        onSubmit({ reaction: value ? value : `(${inputValue})` });
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
        <span className="text-xs text-muted-foreground font-medium">Reaction</span>

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
            {stripParens(value)}
          </button>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. p,n"
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
            <div className="px-3 py-2 text-xs text-muted-foreground">No reactions found.</div>
          ) : (
            filtered.map((reaction) => (
              <button
                key={reaction}
                onClick={() => selectReaction(reaction)}
                className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                  value === reaction ? "bg-muted font-medium" : ""
                }`}
              >
                <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
                  {stripParens(reaction)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
