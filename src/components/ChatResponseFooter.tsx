import { useState, useRef } from "react";
import { ThumbsUp, ThumbsDown, Copy, Check, BookOpen, ExternalLink, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";
import type { MessageSources } from "@/hooks/useChat";
import { usePaperLookup } from "@/hooks/usePaperLookup";
import { TextSearch } from "@/components/icons/TextSearch";

interface ChatResponseFooterProps {
  content: string;
  isStreaming?: boolean;
  sources?: MessageSources;
  pdfUrl?: string;
}

export function ChatResponseFooter({
  content,
  isStreaming = false,
  sources,
  pdfUrl,
}: ChatResponseFooterProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"good" | "bad" | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const abstractRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const { data: paperData } = usePaperLookup(pdfUrl);

  // Use S2 open-access PDF when available, otherwise fall back to direct .pdf URLs
  const effectivePdfUrl =
    paperData?.openAccessPdfUrl ??
    (pdfUrl && pdfUrl.toLowerCase().endsWith(".pdf") ? pdfUrl : undefined);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isStreaming) return null;

  const totalCount = sources
    ? sources.nsr.length + sources.s2.length
    : 0;

  return (
    <div className="pt-3 border-t animate-in fade-in duration-300">
      <div className="flex items-center gap-1">
        {/* Sources (Book icon) */}
        {totalCount > 0 && (
          <button
            onClick={() => {
              setSourcesOpen(!sourcesOpen);
              if (!sourcesOpen) {
                setTimeout(() => sourcesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
              }
            }}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              sourcesOpen
                ? "text-foreground bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={`${totalCount} source${totalCount !== 1 ? "s" : ""}`}
          >
            <BookOpen className="h-4 w-4" />
          </button>
        )}

        {/* Abstract (TextSearch icon) — visible when S2 paper data is available */}
        {paperData && (
          <button
            onClick={() => {
              setAbstractOpen(!abstractOpen);
              if (!abstractOpen) {
                setTimeout(() => abstractRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
              }
            }}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              abstractOpen
                ? "text-foreground bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="View abstract"
          >
            <TextSearch className="h-4 w-4" />
          </button>
        )}

        {/* PDF viewer */}
        {effectivePdfUrl && (
          <button
            onClick={() => {
              setPdfOpen(!pdfOpen);
              if (!pdfOpen) {
                setTimeout(() => pdfRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
              }
            }}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              pdfOpen
                ? "text-foreground bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="View PDF"
          >
            <FileText className="h-4 w-4" />
          </button>
        )}

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Copy response"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>

        {/* Thumbs Up / Down */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setFeedback(feedback === "good" ? null : "good")}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              feedback === "good"
                ? "text-green-600 hover:text-green-600 hover:bg-green-50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Good response"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFeedback(feedback === "bad" ? null : "bad")}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
              feedback === "bad"
                ? "text-red-500 hover:text-red-500 hover:bg-red-50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Bad response"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sources dropdown */}
      {sourcesOpen && sources && (
        <div ref={sourcesRef} className="mt-2 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="px-3 py-2 space-y-3">
            {/* NSR Records */}
            {sources.nsr.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  NSR Records
                </p>
                <div className="space-y-1.5">
                  {sources.nsr.map((r) => {
                    const href = r.doi
                      ? `https://doi.org/${r.doi}`
                      : undefined;
                    const Row = href ? "a" : "div";
                    return (
                      <Row
                        key={r.key_number}
                        {...(href
                          ? {
                              href,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className="flex items-start gap-2 text-xs rounded-md bg-muted/30 px-2.5 py-1.5 transition-colors hover:bg-muted/60 cursor-pointer"
                      >
                        <span className="font-mono font-bold text-foreground shrink-0">
                          {r.key_number}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">
                          {r.title}
                        </span>
                        {href && (
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        )}
                      </Row>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Semantic Scholar Papers */}
            {sources.s2.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Semantic Scholar
                </p>
                <div className="space-y-1.5">
                  {sources.s2.map((p, i) => {
                    const Row = p.url ? "a" : "div";
                    return (
                      <Row
                        key={i}
                        {...(p.url
                          ? {
                              href: p.url,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className="flex items-start gap-2 text-xs rounded-md bg-muted/30 px-2.5 py-1.5 transition-colors hover:bg-muted/60 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground font-medium line-clamp-1">
                            {p.title}
                          </span>
                          <span className="text-muted-foreground block truncate">
                            {p.authors} &middot; {p.citations} citations
                          </span>
                        </div>
                        {p.url && (
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/70 mt-0.5" />
                        )}
                      </Row>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abstract panel */}
      {abstractOpen && paperData && (
        <div ref={abstractRef} className="mt-2 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="px-3 py-2 bg-muted/40 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {paperData.title && (
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {paperData.title}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  {paperData.authors.length > 0 && (
                    <span>{paperData.authors.join(", ")}</span>
                  )}
                  {paperData.year && <span>&middot; {paperData.year}</span>}
                  {paperData.venue && <span>&middot; {paperData.venue}</span>}
                  {paperData.citationCount != null && (
                    <span>&middot; {paperData.citationCount} citations</span>
                  )}
                </div>
              </div>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Open DOI
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          {paperData.abstract && (
            <div className="px-3 py-2">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {paperData.abstract}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Inline PDF viewer */}
      {pdfOpen && effectivePdfUrl && (
        <div ref={pdfRef} className="mt-2 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {paperData ? "Paper PDF" : "ENDF Report PDF"}
            </span>
            <a
              href={effectivePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe
            src={`${effectivePdfUrl}#navpanes=0&view=FitH`}
            title={paperData ? "Paper PDF" : "ENDF Report PDF"}
            className="w-full h-[600px] bg-background"
          />
        </div>
      )}
    </div>
  );
}
