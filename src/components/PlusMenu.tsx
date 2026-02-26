import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, ChevronRight, ArrowLeft,
  Lightbulb, Atom, Zap, Users, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Sample prompts                                                      */
/* ------------------------------------------------------------------ */

interface SamplePrompt {
  title: string;
  description: string;
  prompt: string;
  searchTerm: string;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    title: "Neutron Capture Cross Sections",
    description: "Recent measurements for U-235, Pu-239, and Th-232",
    prompt: "What are the most recent experimental measurements of neutron capture cross sections for U-235, Pu-239, and Th-232?",
    searchTerm: "neutron capture cross sections U-235",
  },
  {
    title: "Half-Life Conflicts Near N=82",
    description: "Conflicting measurements near the neutron shell closure",
    prompt: "Are there any conflicting experimental measurements of half-lives for nuclei near the N=82 neutron shell closure?",
    searchTerm: "half-lives N=82",
  },
  {
    title: "Chiral EFT in Nuclear Matter",
    description: "Applications of chiral effective field theory",
    prompt: "How has chiral effective field theory been applied to nuclear matter calculations in recent literature?",
    searchTerm: "chiral effective field theory nuclear matter",
  },
  {
    title: "Structure of Pb-208",
    description: "Key experimental and theoretical papers",
    prompt: "What are the most important experimental and theoretical papers related to the structure of Pb-208?",
    searchTerm: "208Pb structure",
  },
  {
    title: "Ni-64(p,n) Reaction",
    description: "Experimental techniques for cross section measurement",
    prompt: "What experimental techniques have been used to measure the Ni-64(p,n) reaction cross section?",
    searchTerm: "64Ni(p,n) cross section",
  },
  {
    title: "R-Process Nucleosynthesis",
    description: "Critical nuclear reactions in recent studies",
    prompt: "What nuclear reactions are considered most critical to r-process nucleosynthesis according to recent studies?",
    searchTerm: "r-process nucleosynthesis",
  },
  {
    title: "Neutron-Rich Calcium Isotopes",
    description: "Leading authors and institutions",
    prompt: "Which authors and institutions have published the most research on neutron-rich calcium isotopes?",
    searchTerm: "neutron-rich calcium isotopes",
  },
  {
    title: "Medical Isotope Cu-64",
    description: "Production methods and yields",
    prompt: "What recent studies exist on production methods and yields for the medical isotope Cu-64?",
    searchTerm: "64Cu production medical isotope",
  },
  {
    title: "Direct vs. Compound Reactions",
    description: "Experimental evidence in medium-mass nuclei",
    prompt: "What experimental evidence supports direct reaction mechanisms versus compound nucleus formation in medium-mass nuclei?",
    searchTerm: "direct reaction compound nucleus medium-mass",
  },
  {
    title: "Neutron Drip Line Discoveries",
    description: "New experimental discoveries near the drip line",
    prompt: "What new experimental discoveries have been reported for nuclei near the neutron drip line?",
    searchTerm: "neutron drip line",
  },
];

/* ------------------------------------------------------------------ */
/*  + menu category types                                              */
/* ------------------------------------------------------------------ */

type DrawerCategory = "prompts" | "nuclides" | "reactions" | "authors";

interface CategoryDef {
  key: DrawerCategory;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  { key: "prompts", label: "Sample Questions", icon: <Lightbulb className="h-5 w-5" /> },
  { key: "nuclides", label: "Nuclides", icon: <Atom className="h-5 w-5" /> },
  { key: "reactions", label: "Reactions", icon: <Zap className="h-5 w-5" /> },
  { key: "authors", label: "Authors", icon: <Users className="h-5 w-5" /> },
];

/* ------------------------------------------------------------------ */
/*  DB item shape                                                      */
/* ------------------------------------------------------------------ */

interface DbItem {
  value: string;
  record_count: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 30;
const SCROLL_THRESHOLD = 60;
const SEARCH_DEBOUNCE = 300;
const MIN_SEARCH_LEN = 2;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PlusMenuProps {
  onSelect: (text: string) => void;
  mode: "chat" | "search";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PlusMenu({ onSelect, mode }: PlusMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState<DrawerCategory | null>(null);
  const [openAbove, setOpenAbove] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Per-category DB items
  const [availableNuclides, setAvailableNuclides] = useState<DbItem[]>([]);
  const [nuclidesLoading, setNuclidesLoading] = useState(false);
  const [nuclidesHasMore, setNuclidesHasMore] = useState(true);

  const [availableReactions, setAvailableReactions] = useState<DbItem[]>([]);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [reactionsHasMore, setReactionsHasMore] = useState(true);

  const [availableAuthors, setAvailableAuthors] = useState<DbItem[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorsHasMore, setAuthorsHasMore] = useState(true);

  // Drawer search
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerSearchResults, setDrawerSearchResults] = useState<DbItem[] | null>(null);
  const [drawerSearchLoading, setDrawerSearchLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- close menu on outside click ----
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // ---- fetch functions ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const fetchNuclidesForSelection = useCallback(async (offset: number) => {
    setNuclidesLoading(true);
    const { data, error } = await db
      .from("distinct_nuclides")
      .select("value, record_count")
      .order("value", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) console.error("distinct_nuclides error:", error);
    const rows = (data ?? []) as DbItem[];
    setAvailableNuclides((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setNuclidesHasMore(rows.length === PAGE_SIZE);
    setNuclidesLoading(false);
  }, []);

  const fetchReactionsForSelection = useCallback(async (offset: number) => {
    setReactionsLoading(true);
    const { data, error } = await db
      .from("distinct_reactions")
      .select("value, record_count")
      .order("value", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) console.error("distinct_reactions error:", error);
    const rows = (data ?? []) as DbItem[];
    setAvailableReactions((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setReactionsHasMore(rows.length === PAGE_SIZE);
    setReactionsLoading(false);
  }, []);

  const fetchAuthorsForSelection = useCallback(async (offset: number) => {
    setAuthorsLoading(true);
    const { data, error } = await db
      .from("distinct_authors")
      .select("value, record_count")
      .order("value", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) console.error("distinct_authors error:", error);
    const rows = (data ?? []) as DbItem[];
    setAvailableAuthors((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setAuthorsHasMore(rows.length === PAGE_SIZE);
    setAuthorsLoading(false);
  }, []);

  // ---- open a drawer category ----
  const openDrawer = useCallback(
    (cat: DrawerCategory) => {
      setDrawerCategory(cat);
      setDrawerSearch("");
      setDrawerSearchResults(null);
      if (cat === "nuclides" && availableNuclides.length === 0) fetchNuclidesForSelection(0);
      if (cat === "reactions" && availableReactions.length === 0) fetchReactionsForSelection(0);
      if (cat === "authors" && availableAuthors.length === 0) fetchAuthorsForSelection(0);
    },
    [availableNuclides.length, availableReactions.length, availableAuthors.length,
     fetchNuclidesForSelection, fetchReactionsForSelection, fetchAuthorsForSelection],
  );

  // ---- server-side search with debounce ----
  useEffect(() => {
    if (!drawerCategory || drawerCategory === "prompts") return;
    if (drawerSearch.length < MIN_SEARCH_LEN) {
      setDrawerSearchResults(null);
      return;
    }

    setDrawerSearchLoading(true);
    const timer = setTimeout(async () => {
      const viewName =
        drawerCategory === "nuclides"
          ? "distinct_nuclides"
          : drawerCategory === "reactions"
            ? "distinct_reactions"
            : "distinct_authors";

      const { data, error } = await db
        .from(viewName)
        .select("value, record_count")
        .ilike("value", `%${drawerSearch}%`)
        .order("value", { ascending: true })
        .limit(PAGE_SIZE);
      if (error) console.error(`${viewName} search error:`, error);
      setDrawerSearchResults((data ?? []) as DbItem[]);
      setDrawerSearchLoading(false);
    }, SEARCH_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [drawerSearch, drawerCategory]);

  // ---- infinite scroll ----
  const handlePopoverScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !drawerCategory || drawerCategory === "prompts") return;
    if (drawerSearch.length >= MIN_SEARCH_LEN) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
    if (!nearBottom) return;

    if (drawerCategory === "nuclides" && !nuclidesLoading && nuclidesHasMore) {
      fetchNuclidesForSelection(availableNuclides.length);
    } else if (drawerCategory === "reactions" && !reactionsLoading && reactionsHasMore) {
      fetchReactionsForSelection(availableReactions.length);
    } else if (drawerCategory === "authors" && !authorsLoading && authorsHasMore) {
      fetchAuthorsForSelection(availableAuthors.length);
    }
  }, [
    drawerCategory, drawerSearch,
    nuclidesLoading, nuclidesHasMore, availableNuclides.length,
    reactionsLoading, reactionsHasMore, availableReactions.length,
    authorsLoading, authorsHasMore, availableAuthors.length,
    fetchNuclidesForSelection, fetchReactionsForSelection, fetchAuthorsForSelection,
  ]);

  // ---- helpers ----
  const closeMenu = () => {
    setMenuOpen(false);
    setDrawerCategory(null);
    setDrawerSearch("");
    setDrawerSearchResults(null);
  };

  const handleItemSelect = (text: string) => {
    onSelect(text);
    closeMenu();
  };

  // ---- what to render in the drawer ----
  const getDrawerItems = (): DbItem[] => {
    if (drawerSearchResults !== null) return drawerSearchResults;
    if (drawerCategory === "nuclides") return availableNuclides;
    if (drawerCategory === "reactions") return availableReactions;
    if (drawerCategory === "authors") return availableAuthors;
    return [];
  };

  const isDrawerLoading = () => {
    if (drawerSearchLoading) return true;
    if (drawerCategory === "nuclides") return nuclidesLoading;
    if (drawerCategory === "reactions") return reactionsLoading;
    if (drawerCategory === "authors") return authorsLoading;
    return false;
  };

  const handleDbItemClick = (item: DbItem) => {
    if (mode === "search") {
      handleItemSelect(item.value);
      return;
    }

    let prompt = "";
    if (drawerCategory === "nuclides") {
      prompt = `What papers in the NSR database discuss ${item.value}? Summarize their key findings and significance.`;
    } else if (drawerCategory === "reactions") {
      prompt = `What papers in the NSR database discuss ${item.value} reactions? Summarize their measurements, methods, and key results.`;
    } else if (drawerCategory === "authors") {
      prompt = `What papers by ${item.value} are in the NSR database? Summarize their research contributions and key findings.`;
    }
    handleItemSelect(prompt);
  };

  const handleSamplePromptClick = (p: SamplePrompt) => {
    handleItemSelect(mode === "search" ? p.searchTerm : p.prompt);
  };

  // client-side filtered sample prompts
  const filteredPrompts = SAMPLE_PROMPTS.filter(
    (p) =>
      !drawerSearch ||
      p.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(drawerSearch.toLowerCase()),
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (menuOpen) {
            closeMenu();
          } else {
            if (btnRef.current) {
              const rect = btnRef.current.getBoundingClientRect();
              setOpenAbove(rect.top > 300);
            }
            setMenuOpen(true);
            setDrawerCategory(null);
            setDrawerSearch("");
            setDrawerSearchResults(null);
          }
        }}
        className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-5 w-5" />
      </button>

      {menuOpen && !drawerCategory && (
        /* -------- Category list -------- */
        <div className={`absolute left-0 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] md:w-56 rounded-2xl border border-border/60 bg-background shadow-xl animate-in fade-in duration-150 overflow-hidden ${
          openAbove ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
        }`}>
          <div className="py-1">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.key}
                onClick={() => openDrawer(cat.key)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors ${
                  i > 0 ? "border-t border-border/40" : ""
                }`}
              >
                <span className="text-muted-foreground">{cat.icon}</span>
                {cat.label}
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {menuOpen && drawerCategory && (
        /* -------- Drawer -------- */
        <div className={`absolute left-0 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] md:w-80 rounded-2xl border border-border/60 bg-background shadow-xl animate-in fade-in duration-150 overflow-hidden ${
          openAbove ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
        }`}>
          {/* Header: back + search + clear */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
            <button
              onClick={() => {
                setDrawerCategory(null);
                setDrawerSearch("");
                setDrawerSearchResults(null);
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              placeholder={`Search ${CATEGORIES.find((c) => c.key === drawerCategory)?.label ?? ""}...`}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
            />
            {drawerSearch && (
              <button
                onClick={() => {
                  setDrawerSearch("");
                  setDrawerSearchResults(null);
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div
            ref={scrollRef}
            onScroll={handlePopoverScroll}
            className="max-h-[320px] overflow-y-auto"
          >
            {drawerCategory === "prompts" ? (
              /* Sample Questions — client-side */
              <>
                {filteredPrompts.map((p, i) => (
                  <button
                    key={p.title}
                    onClick={() => handleSamplePromptClick(p)}
                    className={`flex w-full flex-col items-start px-4 py-3 hover:bg-muted transition-colors ${
                      i > 0 ? "border-t border-border/40" : ""
                    }`}
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
                  <p className="px-4 py-3 text-xs text-muted-foreground">No matches</p>
                )}
              </>
            ) : (
              /* DB-backed category (nuclides / reactions / authors) */
              <>
                {getDrawerItems().map((item, i) => (
                  <button
                    key={item.value}
                    onClick={() => handleDbItemClick(item)}
                    className={`flex w-full flex-col items-start px-4 py-3 hover:bg-muted transition-colors ${
                      i > 0 ? "border-t border-border/40" : ""
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {item.value}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.record_count.toLocaleString()} record{item.record_count !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
                {isDrawerLoading() && (
                  <p className="px-4 py-3 text-xs text-muted-foreground">Loading…</p>
                )}
                {!isDrawerLoading() && getDrawerItems().length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No matches</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
