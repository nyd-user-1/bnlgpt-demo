import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Square, ChevronDown, ChevronRight, ArrowLeft, Lightbulb, Atom, Zap, FlaskConical } from "lucide-react";

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
  icon: React.ReactNode;
  prompts: SamplePrompt[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: "Sample Questions",
    icon: <Lightbulb className="h-5 w-5" />,
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
    icon: <Atom className="h-5 w-5" />,
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
    icon: <Zap className="h-5 w-5" />,
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
    icon: <FlaskConical className="h-5 w-5" />,
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

  // Model selector state
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("GPT-4o");
  const modelRef = useRef<HTMLDivElement>(null);

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

  // Close menus on outside click
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    }
    if (modelMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modelMenuOpen]);

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
      <div className="rounded-2xl bg-[#f4f4f4] border-0 p-3 shadow-lg">
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
                        <span className="text-muted-foreground">{cat.icon}</span>
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
                <div className="absolute bottom-full right-0 mb-2 w-[260px] rounded-xl border bg-background shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden py-1">
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

            {/* Send button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() && !isLoading}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                isLoading
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-black hover:bg-black/85 text-white"
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
