import { memo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowUp, Copy, Check, Hash } from "lucide-react";
import type { NsrRecord } from "@/types/nsr";
import type { SearchMode } from "@/hooks/useNsrSearch";
import { useFeedEmitter } from "@/hooks/useFeedEmitter";

interface NsrRecordCardProps {
  record: NsrRecord;
  searchQuery?: string;
  searchMode?: SearchMode;
  onClick?: () => void;
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-nuclear/20 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const NsrRecordCard = memo(function NsrRecordCard({ record, searchQuery, searchMode, onClick }: NsrRecordCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { emit } = useFeedEmitter();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = [
      `${record.key_number} (${record.pub_year})`,
      record.title,
      record.authors ?? "",
      record.reference ?? "",
      record.doi ? `DOI: ${record.doi}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendToChat = (e: React.MouseEvent) => {
    e.stopPropagation();

    const prompt = `Tell me about "${record.title}"${
      record.authors ? ` by ${record.authors}` : ""
    }. What is the significance of this research?`;

    const context = [
      `Title: ${record.title}`,
      record.authors ? `Authors: ${record.authors}` : null,
      `Key Number: ${record.key_number}`,
      `Year: ${record.pub_year}`,
      record.reference ? `Reference: ${record.reference}` : null,
      record.doi ? `DOI: ${record.doi}` : null,
      record.keywords ? `Keywords: ${record.keywords}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const url = record.doi ? `https://doi.org/${record.doi}` : "";

    const params = new URLSearchParams({ prompt, context });
    if (url) params.set("url", url);

    navigate(`/?${params.toString()}`);

    emit({
      event_type: "record_inquiry",
      category: "chat",
      entity_type: "nsr_record",
      entity_value: record.key_number,
      display_text: `Inquired about ${record.key_number}: "${record.title.slice(0, 60)}"`,
      metadata: { doi: record.doi },
    });
  };

  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg border border-border/40 bg-muted/40 p-4 pb-14 md:p-6 md:pb-16 min-h-[240px] md:min-h-[280px] transition-all hover:shadow-lg hover:border-border active:shadow-lg active:border-border cursor-pointer"
    >
      {/* Top row: hash icon + key number + year */}
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <span className="text-base font-bold">{record.key_number}</span>
        <span className="ml-auto flex items-center gap-2">
          {record.similarity != null && (
            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
              Match {Math.round(record.similarity * 100)}%
            </span>
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {record.pub_year}
          </span>
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-foreground leading-snug mb-3 line-clamp-2">
        {searchMode === "keyword" && searchQuery
          ? highlightText(record.title, searchQuery)
          : record.title}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* Row 1, Col 1: Authors */}
        <div className="min-w-0">
          {record.authors && (
            <>
              <span className="text-muted-foreground">Authors</span>
              <p className="font-medium truncate">
                {(() => {
                  const names = record.authors.split(";").map((n) => n.trim());
                  const display = names.length <= 3
                    ? record.authors
                    : names.slice(0, 3).join("; ") + "; et al.";
                  return searchMode === "keyword" && searchQuery
                    ? highlightText(display, searchQuery)
                    : display;
                })()}
              </p>
            </>
          )}
        </div>

        {/* Row 1, Col 2: Reference */}
        <div className="min-w-0">
          {record.reference && (
            <>
              <span className="text-muted-foreground">Reference</span>
              <p className="font-medium truncate">
                {record.reference.replace(/\s*\(\d{4}\)\s*$/, "")}
              </p>
            </>
          )}
        </div>

        {/* Row 2, Col 1: Nuclides */}
        <div className="min-w-0">
          {record.nuclides && record.nuclides.length > 0 && (
            <>
              <span className="text-muted-foreground">Nuclides</span>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {record.nuclides.slice(0, 3).map((nuc) => (
                  <span
                    key={nuc}
                    className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {nuc}
                  </span>
                ))}
                {record.nuclides.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{record.nuclides.length - 3}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Row 2, Col 2: Reactions */}
        <div className="min-w-0">
          {record.reactions && record.reactions.length > 0 && (
            <>
              <span className="text-muted-foreground">Reactions</span>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {record.reactions.slice(0, 3).map((rxn) => (
                  <span
                    key={rxn}
                    className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {rxn}
                  </span>
                ))}
                {record.reactions.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{record.reactions.length - 3}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Bottom bar: DOI left, action buttons right */}
      <div className="absolute bottom-3 left-4 md:bottom-4 md:left-6 right-4 flex items-center justify-between">
        {record.doi ? (
          <a
            href={`https://doi.org/${record.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-nuclear hover:underline truncate max-w-[60%]"
          >
            {record.doi}
          </a>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground shadow-lg transition-all hover:scale-110"
          title="Copy reference details"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={handleSendToChat}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-110"
          title="Ask NSRgpt about this reference"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        </div>
      </div>
    </div>
  );
});
