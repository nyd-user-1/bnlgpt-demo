import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, ChevronDown } from "lucide-react";
import { PlusMenu } from "@/components/PlusMenu";

/* ------------------------------------------------------------------ */
/*  Model selector (visual only — we always use GPT-4o)                */
/* ------------------------------------------------------------------ */

const OPENAI_ICON = (
  <img src="/openai-logo.avif" alt="OpenAI" width={16} height={16} className="rounded-sm" />
);

const ANTHROPIC_ICON = (
  <img src="/claude-logo.avif" alt="Anthropic" width={16} height={16} className="rounded-sm" />
);

interface ModelOption {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const MODEL_OPTIONS: ModelOption[] = [
  { label: "GPT-4o", description: "Most capable GPT model", icon: OPENAI_ICON },
  { label: "GPT-4o Mini", description: "Fast and efficient", icon: OPENAI_ICON },
  { label: "GPT-4 Turbo", description: "High capability, large context", icon: OPENAI_ICON },
  { label: "Claude Sonnet 4.5", description: "Smart & balanced", icon: ANTHROPIC_ICON },
  { label: "Claude Haiku 4.5", description: "Fast & efficient", icon: ANTHROPIC_ICON },
  { label: "Claude Opus 4.5", description: "Maximum intelligence", icon: ANTHROPIC_ICON },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  initialValue?: string;
}

export function ChatInput({ onSubmit, onStop, isLoading, initialValue }: ChatInputProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Model selector state
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("GPT-4o");
  const modelRef = useRef<HTMLDivElement>(null);

  // ---- textarea auto-resize ----
  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

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

  // ---- close model menu on outside click ----
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    }
    if (modelMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modelMenuOpen]);

  // ---- helpers ----
  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    setValue(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="max-w-[720px] mx-auto w-full">
      <div className="rounded-2xl bg-secondary border border-border p-3 shadow-lg">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chat with the NSRdb"
          rows={1}
          className="flex-1 min-h-[40px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60 text-base text-foreground outline-none"
        />

        {/* Bottom row: + button, model label, send button */}
        <div className="flex items-center justify-between pt-1">
          {/* + button with popup */}
          <PlusMenu mode="chat" onSelect={handleSelectPrompt} />

          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative" ref={modelRef}>
              <button
                type="button"
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1"
              >
                {MODEL_OPTIONS.find((m) => m.label === selectedModel)?.icon}
                <span className="font-medium">{selectedModel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {modelMenuOpen && (
                <div className="absolute bottom-full left-0 md:left-auto md:right-0 mb-2 w-[calc(100vw-2rem)] md:w-[260px] rounded-xl border bg-background shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden py-1">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => {
                        setSelectedModel(m.label);
                        setModelMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="shrink-0">{m.icon}</span>
                      <div className="flex-1 text-left">
                        <span className="font-medium text-foreground">{m.label}</span>
                        <span className="block text-xs text-muted-foreground">{m.description}</span>
                      </div>
                      {m.label === selectedModel && (
                        <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send / Stop button */}
            <button
              type="button"
              onClick={isLoading ? onStop : handleSubmit}
              disabled={!isLoading && !value.trim()}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isLoading
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-foreground hover:bg-foreground/85 text-background"
              }`}
            >
              {isLoading ? (
                <Square className="h-4 w-4" fill="currentColor" />
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
