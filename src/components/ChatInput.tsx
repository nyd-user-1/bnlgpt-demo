import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Square, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sample prompts data                                                */
/* ------------------------------------------------------------------ */

interface SamplePrompt {
  title: string;
  description: string;
  prompt: string;
}

interface PromptCategory {
  label: string;
  icon: string;
  prompts: SamplePrompt[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: "Sample Questions",
    icon: "\u2728",
    prompts: [
      {
        title: "Cross Section Analysis",
        description: "What are the latest measurements of neutron capture cross sections for actinides?",
        prompt: "What are the latest measurements of neutron capture cross sections for actinides?",
      },
      {
        title: "Nuclear Structure",
        description: "Explain shell model predictions for doubly-magic nuclei like 208Pb",
        prompt: "Explain shell model predictions for doubly-magic nuclei like 208Pb",
      },
      {
        title: "Reaction Mechanisms",
        description: "Compare direct and compound nucleus reaction mechanisms in nuclear physics",
        prompt: "Compare direct and compound nucleus reaction mechanisms in nuclear physics",
      },
      {
        title: "Nuclear Astrophysics",
        description: "How do nuclear reactions in stellar environments produce heavy elements?",
        prompt: "How do nuclear reactions in stellar environments produce heavy elements through the r-process and s-process?",
      },
    ],
  },
  {
    label: "Nuclides",
    icon: "\u269B\uFE0F",
    prompts: [
      {
        title: "Oxygen-16",
        description: "What nuclear data is available for 16O and its reactions?",
        prompt: "What nuclear data and recent measurements are available for oxygen-16 (16O)?",
      },
      {
        title: "Lead-208",
        description: "Summarize research on the doubly-magic nucleus 208Pb",
        prompt: "Summarize the latest research on the doubly-magic nucleus lead-208 (208Pb)",
      },
      {
        title: "Helium-6",
        description: "What do we know about the halo nucleus 6He?",
        prompt: "What do we know about the halo nucleus helium-6 (6He)? Summarize recent experimental results.",
      },
      {
        title: "Uranium-238",
        description: "Overview of 238U fission and capture data",
        prompt: "Give me an overview of uranium-238 (238U) fission and neutron capture cross section data",
      },
    ],
  },
  {
    label: "Reactions",
    icon: "\uD83D\uDD2C",
    prompts: [
      {
        title: "Neutron Capture",
        description: "Explain (n,gamma) reactions and their importance",
        prompt: "Explain neutron capture (n,gamma) reactions and their importance in nuclear science and technology",
      },
      {
        title: "Elastic Scattering",
        description: "What are the key features of (p,p) elastic scattering?",
        prompt: "What are the key features of proton elastic scattering (p,p) and what can it tell us about nuclear structure?",
      },
      {
        title: "Fission",
        description: "Overview of nuclear fission mechanisms and data",
        prompt: "Provide an overview of nuclear fission mechanisms, including recent data on fission fragment distributions",
      },
      {
        title: "Transfer Reactions",
        description: "How are (d,p) reactions used to study nuclear structure?",
        prompt: "How are deuteron-induced transfer reactions (d,p) used to study single-particle structure in nuclei?",
      },
    ],
  },
  {
    label: "Experimental Methods",
    icon: "\uD83E\uDDEA",
    prompts: [
      {
        title: "Time-of-Flight",
        description: "How does the time-of-flight technique measure neutron cross sections?",
        prompt: "How does the time-of-flight technique work for measuring neutron cross sections?",
      },
      {
        title: "Gamma Spectroscopy",
        description: "What role does gamma-ray spectroscopy play in nuclear data?",
        prompt: "What role does gamma-ray spectroscopy play in nuclear structure studies and nuclear data measurements?",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Model selector (visual only — we always use GPT-4o)                */
/* ------------------------------------------------------------------ */

const OPENAI_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

export function ChatInput({ onSubmit, isLoading, initialValue }: ChatInputProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // + menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PromptCategory | null>(null);
  const [promptSearch, setPromptSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setActiveCategory(null);
        setPromptSearch("");
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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
    setMenuOpen(false);
    setActiveCategory(null);
    setPromptSearch("");
    textareaRef.current?.focus();
  };

  const filteredPrompts = activeCategory
    ? activeCategory.prompts.filter(
        (p) =>
          !promptSearch ||
          p.title.toLowerCase().includes(promptSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(promptSearch.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-[720px] mx-auto w-full">
      <div className="rounded-2xl bg-[#fafafa] border-0 p-3 shadow-lg">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you researching?"
          rows={1}
          className="flex-1 min-h-[40px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60 text-base text-black outline-none"
        />

        {/* Bottom row: + button, model label, send button */}
        <div className="flex items-center justify-between pt-1">
          {/* + button with popup */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setActiveCategory(null);
                setPromptSearch("");
              }}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-[#e8e8e8] hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[320px] rounded-xl border bg-background shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
                {!activeCategory ? (
                  /* Category list */
                  <div className="py-1">
                    {PROMPT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.label}
                        onClick={() => setActiveCategory(cat)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <span className="text-base">{cat.icon}</span>
                        {cat.label}
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Prompt list with search */
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b">
                      <button
                        onClick={() => {
                          setActiveCategory(null);
                          setPromptSearch("");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        value={promptSearch}
                        onChange={(e) => setPromptSearch(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto py-1">
                      {filteredPrompts.map((p) => (
                        <button
                          key={p.title}
                          onClick={() => handleSelectPrompt(p.prompt)}
                          className="flex w-full flex-col items-start px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {p.title}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-2 text-left">
                            {p.description}
                          </span>
                        </button>
                      ))}
                      {filteredPrompts.length === 0 && (
                        <p className="px-4 py-3 text-xs text-muted-foreground">
                          No matches
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector (visual) */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1"
            >
              {OPENAI_ICON}
              <span className="font-medium">GPT-4o</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() && !isLoading}
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                isLoading
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-foreground hover:bg-foreground/90 text-background"
              } disabled:opacity-30`}
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
