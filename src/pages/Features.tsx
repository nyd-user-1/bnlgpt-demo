import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Comparison data                                                     */
/* ------------------------------------------------------------------ */

interface FeatureRow {
  feature: string;
  nndc: string[] | null; // null = not available
  nsrgpt: string[];
}

interface FeatureCategory {
  name: string;
  rows: FeatureRow[];
}

const CATEGORIES: FeatureCategory[] = [
  {
    name: "Search",
    rows: [
      {
        feature: "Structured search",
        nndc: [
          "Quick Search: author, nuclide, or reaction within a date range",
          "Text Search: plain text matching against title and keyword fields",
          "Indexed Search: structured fields (author, nuclide, reaction, incident/outgoing particle, Z/A range)",
          "Keynumber Search: direct lookup by NSR keynumber",
          "DOI Search: lookup by digital object identifier",
          "Boolean operators supported in Indexed Search",
          "Exact-string keyword matching",
        ],
        nsrgpt: [
          "All NNDC structured search capabilities (nuclide, reaction, author, Z-range filters)",
          "Semantic vector search: OpenAI text-embedding-3-small, 256 dimensions",
          "Every NSR record has a pre-computed embedding stored in pgvector",
          "Cosine similarity search across 88,000+ record vectors",
          "Hybrid mode: text pre-filter followed by semantic reranking",
          "Toggle between semantic and keyword search modes in the UI",
          "Natural language query input \u2014 no syntax required",
          "320ms debounced queries with in-memory query cache",
        ],
      },
    ],
  },
  {
    name: "AI Chat",
    rows: [
      {
        feature: "Conversational AI",
        nndc: null,
        nsrgpt: [
          "Conversational interface powered by GPT-4o",
          "Retrieval-Augmented Generation: query \u2192 embed \u2192 retrieve top 12 NSR records \u2192 generate grounded response",
          "Parallel retrieval: semantic vectors + structured matching + Semantic Scholar API",
          "Streaming responses via Deno Edge Functions",
          "Every claim cites NSR keynumbers and/or DOIs",
          "Sample prompts for new users",
          "Session history saved per user",
          "One-click \u201CAsk NSRgpt about this\u201D from any record card",
        ],
      },
    ],
  },
  {
    name: "Results Format",
    rows: [
      {
        feature: "Output & export",
        nndc: [
          "Reference list: keynumber, title, authors, journal, year, DOI link",
          "Export: HTML, Text, BibTeX, JSON, CSV, PDF, NSR Exchange",
          "No synthesis or summarization",
        ],
        nsrgpt: [
          "Chat mode: synthesized natural language response with inline citations to NSR keynumbers and DOIs",
          "References mode: full record cards with title, authors, journal, year, keynumber, keywords, DOI",
          "Search mode: faceted analytics with year distribution and author breakdowns",
          "Export: copy citations, JSON, direct DOI links",
        ],
      },
    ],
  },
  {
    name: "External Literature",
    rows: [
      {
        feature: "Cross-referencing",
        nndc: [
          "Searches NSR corpus only",
          "Links to EXFOR for reaction data cross-references",
        ],
        nsrgpt: [
          "Searches NSR corpus",
          "Parallel Semantic Scholar API queries on every chat interaction",
          "Returns external papers with citation counts and URLs alongside NSR records",
          "Deduplication between NSR and Semantic Scholar results",
        ],
      },
    ],
  },
  {
    name: "ENDF Reports",
    rows: [
      {
        feature: "ENDF integration",
        nndc: [
          "Not integrated \u2014 ENDF is a separate database at nndc.bnl.gov/endf",
          "Separate interface, separate search",
        ],
        nsrgpt: [
          "300+ ENDF technical reports indexed with metadata",
          "Searchable by title",
          "Filterable by date range",
          "Inline PDF viewer \u2014 reports open within the app",
          "AI chat can reference and pull context from ENDF reports",
        ],
      },
    ],
  },
  {
    name: "Live Feed",
    rows: [
      {
        feature: "Community features",
        nndc: null,
        nsrgpt: [
          "Real-time Live Feed panel showing all user activity",
          "Tracks: searches, filters, nuclide lookups, reaction filters, AI conversations",
          "Displays trending nuclides and high-impact papers",
          "Clickable feed items \u2014 jump directly to relevant search or record",
          "Timestamps on all feed events",
        ],
      },
    ],
  },
  {
    name: "Application Pages",
    rows: [
      {
        feature: "Interface scope",
        nndc: [
          "Single interface with 6 search sub-interfaces:",
          "Quick Search, Text Search, Indexed Search, Keynumber Search, DOI Search, Recent References",
        ],
        nsrgpt: [
          "5 dedicated pages:",
          "Chat \u2014 conversational AI, streaming, session history, sample prompts",
          "References \u2014 full NSR browser, semantic/keyword search, nuclide and reaction filters",
          "Search \u2014 faceted search with analytics, year/author breakdowns",
          "ENDF Reports \u2014 300+ reports, search, date filters, PDF downloads",
          "Resources \u2014 curated links to X4Pro, EXFOR, EMPIRE, ENDF libraries, GRUCON",
        ],
      },
    ],
  },
  {
    name: "Session State",
    rows: [
      {
        feature: "Persistence",
        nndc: [
          "Stateless \u2014 each search is independent",
          "No session persistence",
          "No history",
        ],
        nsrgpt: [
          "Persistent chat sessions stored per user",
          "Full conversation history in sidebar",
          "Resume any previous session",
          "New chat initiated from any record card",
        ],
      },
    ],
  },
  {
    name: "Infrastructure",
    rows: [
      {
        feature: "Tech stack",
        nndc: [
          "MySQL 5 RDBMS",
          "Java 2 Enterprise Edition",
          "Custom Java Server Pages",
          "Apache/Tomcat web server",
          "RedHat Linux (DELL PowerEdge hardware)",
          "Weekly database updates from human compilers",
        ],
        nsrgpt: [
          "Supabase (PostgreSQL) with pgvector extension",
          "HNSW + IVFFlat indexes for vector similarity",
          "React 19 frontend",
          "Deno Edge Functions for AI streaming",
          "TailwindCSS, React Query, React Router",
          "OpenAI API (embeddings + GPT-4o)",
          "Semantic Scholar API for external literature",
          "88,000+ records with 256-dim vector embeddings",
        ],
      },
    ],
  },
  {
    name: "Performance",
    rows: [
      {
        feature: "Speed & architecture",
        nndc: [
          "Server-side rendering",
          "~700 retrievals/day average",
          "~800 references per session average",
        ],
        nsrgpt: [
          "Client-side rendering with progressive loading",
          "Hybrid search: text pre-filter \u2192 semantic rerank",
          "320ms debounced queries",
          "In-memory query cache",
          "HNSW index for approximate nearest neighbor",
          "IVFFlat index for exact vector search",
          "Optimistic UI updates",
        ],
      },
    ],
  },
  {
    name: "Access",
    rows: [
      {
        feature: "Availability",
        nndc: [
          "nndc.bnl.gov/nsr",
          "Mirrored at IAEA: www-nds.iaea.org/nsr",
          "No authentication required",
        ],
        nsrgpt: [
          "nsr.nysgpt.com",
          "No authentication required for search and browse",
          "Account optional for persistent chat history",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                          */
/* ------------------------------------------------------------------ */

function CategorySection({ category }: { category: FeatureCategory }) {
  return (
    <div>
      {category.rows.map((row) => (
        <div key={row.feature}>
          {/* Desktop: side-by-side grid */}
          <div className="hidden md:grid md:grid-cols-[180px_1fr_1fr] border-b border-border">
            {/* Category label */}
            <div className="bg-foreground/5 px-4 py-4 flex items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {category.name}
              </span>
            </div>

            {/* NNDC column */}
            <div className="px-5 py-4 border-l border-border">
              {row.nndc === null ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">Not available</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {row.nndc.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* NSRgpt column */}
            <div className="px-5 py-4 border-l border-border bg-nuclear/[0.03]">
              <ul className="space-y-1.5">
                {row.nsrgpt.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-nuclear" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mobile: stacked */}
          <div className="md:hidden border-b border-border">
            <div className="bg-foreground/5 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {category.name}
              </span>
            </div>

            {/* NNDC */}
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                NNDC NSR (Existing)
              </p>
              {row.nndc === null ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">Not available</span>
                </div>
              ) : (
                <ul className="space-y-1">
                  {row.nndc.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* NSRgpt */}
            <div className="px-4 py-3 bg-nuclear/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-nuclear mb-2">
                NSRgpt
              </p>
              <ul className="space-y-1">
                {row.nsrgpt.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-nuclear" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function Features() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            NSRgpt — Specs & Features Comparison
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-[600px] mx-auto">
            NNDC NSR Interface vs. NSRgpt | Side-by-Side Technical Specification
          </p>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Desktop header row */}
          <div className="hidden md:grid md:grid-cols-[180px_1fr_1fr] bg-foreground text-background">
            <div className="px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider">Category</span>
            </div>
            <div className="px-5 py-3 border-l border-background/20">
              <span className="text-xs font-bold uppercase tracking-wider">NNDC NSR (Existing)</span>
            </div>
            <div className="px-5 py-3 border-l border-background/20">
              <span className="text-xs font-bold uppercase tracking-wider">NSRgpt</span>
            </div>
          </div>

          {/* Category rows */}
          {CATEGORIES.map((cat) => (
            <CategorySection key={cat.name} category={cat} />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          NNDC — Brookhaven National Laboratory | nsr.nysgpt.com | February 2026
        </p>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <a
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/85 transition-colors"
          >
            Try NSRgpt Search
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
