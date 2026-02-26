import { useState, useRef, useEffect } from "react";
import { ArrowUp, ChevronDown, X, Loader2 } from "lucide-react";
import type { SearchMode } from "@/hooks/useNsrSearch";

/* ------------------------------------------------------------------ */
/*  Mode options                                                        */
/* ------------------------------------------------------------------ */

interface ModeOption {
  value: SearchMode;
  label: string;
  description: string;
  badge?: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: "semantic", label: "Semantic", description: "AI-powered meaning search", badge: "beta" },
  { value: "keyword", label: "Keyword", description: "Keyword search with matching" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  isLoading?: boolean;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  mode,
  onModeChange,
  isLoading,
}: SearchInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = 144;
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, maxHeight) + "px";
      textareaRef.current.style.overflowY =
        textareaRef.current.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [value]);

  // Close mode menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    }
    if (modeMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modeMenuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const selectedMode = MODE_OPTIONS.find((m) => m.value === mode)!;

  return (
    <div className="w-full">
      <div className="rounded-2xl bg-secondary border border-border p-3 shadow-lg">
        {/* Textarea with clear button */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search nuclear science references..."
            rows={1}
            autoFocus
            className="min-h-[40px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 pr-8 placeholder:text-muted-foreground/60 text-base text-foreground outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                textareaRef.current?.focus();
              }}
              className="absolute right-0 top-1 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-1">
          {/* Spacer */}
          <div />

          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <div className="relative" ref={modeRef}>
              <button
                type="button"
                onClick={() => setModeMenuOpen(!modeMenuOpen)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1"
              >
                <span className="font-medium">{selectedMode.label}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${modeMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {modeMenuOpen && (
                <div className="absolute bottom-full left-0 md:left-auto md:right-0 mb-2 w-[calc(100vw-2rem)] md:w-[260px] rounded-xl border bg-background shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden py-1">
                  {MODE_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => {
                        onModeChange(m.value);
                        setModeMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <span className="font-medium text-foreground">
                          {m.label}
                          {m.badge && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {m.badge}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {m.description}
                        </span>
                      </div>
                      {m.value === mode && (
                        <svg
                          className="h-4 w-4 shrink-0 text-foreground"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !value.trim()}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isLoading
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground hover:bg-foreground/85 text-background"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
