import { useState, useRef } from "react";
import { ThumbsUp, ThumbsDown, Copy, Check, BookOpen, ExternalLink, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";
import type { MessageSources } from "@/hooks/useChat";

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
  const [pdfOpen, setPdfOpen] = useState(false);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

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

        {/* PDF viewer */}
        {pdfUrl && (
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

      {/* Inline PDF viewer */}
      {pdfOpen && pdfUrl && (
        <div ref={pdfRef} className="mt-2 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              ENDF Report PDF
            </span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe
            src={`${pdfUrl}#navpanes=0&view=FitH`}
            title="ENDF Report PDF"
            className="w-full h-[600px] bg-background"
          />
        </div>
      )}
    </div>
  );
}
