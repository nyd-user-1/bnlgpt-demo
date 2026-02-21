import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ExternalLink, BookOpen, GraduationCap } from "lucide-react";
import { ChatResponseFooter } from "./ChatResponseFooter";
import type { MessageSources } from "@/hooks/useChat";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  sources?: MessageSources;
}

function SourcesSection({ sources }: { sources: MessageSources }) {
  const [open, setOpen] = useState(false);

  const totalCount = sources.nsr.length + sources.s2.length;
  if (totalCount === 0) return null;

  return (
    <div className="mt-3 mb-4 border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
        {open ? "Hide" : "Show"} {totalCount} source{totalCount !== 1 ? "s" : ""}
      </button>

      {open && (
        <div className="border-t px-3 py-2 space-y-3">
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
      )}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  isStreaming,
  sources,
}: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="bg-muted/40 rounded-lg p-4 border-0 max-w-[70%]">
          <p className="text-base leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 max-w-[720px]">
      <div className="space-y-3 text-base">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed text-foreground">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-semibold mb-3 text-foreground">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mb-2 text-foreground">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-2 text-foreground">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-semibold mb-1 text-foreground">
                {children}
              </h4>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-foreground text-sm">{children}</li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && !content && (
          <span className="inline-block w-1.5 h-4 bg-foreground animate-pulse" />
        )}
      </div>
      {!isStreaming && sources && <SourcesSection sources={sources} />}
      <ChatResponseFooter content={content} isStreaming={isStreaming} />
    </div>
  );
}
