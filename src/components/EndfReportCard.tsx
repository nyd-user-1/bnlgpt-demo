import { memo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FileText, Copy, Check, ExternalLink, ArrowUp } from "lucide-react";
import type { EndfReport } from "@/types/endf";
import { useFeedEmitter } from "@/hooks/useFeedEmitter";

interface EndfReportCardProps {
  report: EndfReport;
  searchQuery?: string;
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

export const EndfReportCard = memo(function EndfReportCard({ report, searchQuery }: EndfReportCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { emit } = useFeedEmitter();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = [
      report.report_number,
      report.title,
      report.authors ?? "",
      report.report_date ?? "",
      report.cross_reference ? `Cross Ref: ${report.cross_reference}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendToChat = (e: React.MouseEvent) => {
    e.stopPropagation();

    const prompt = `Tell me about "${report.title}"${
      report.authors ? ` by ${report.authors}` : ""
    }. What is the significance of this ENDF report?`;

    const context = [
      `Title: ${report.title}`,
      report.authors ? `Authors: ${report.authors}` : null,
      `Report Number: ${report.report_number}`,
      report.report_date ? `Date: ${report.report_date}` : null,
      report.cross_reference ? `Cross Reference: ${report.cross_reference}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const url = report.pdf_url ?? "";

    const params = new URLSearchParams({ prompt, context });
    if (url) params.set("url", url);

    navigate(`/?${params.toString()}`);

    emit({
      event_type: "record_inquiry",
      category: "chat",
      entity_type: "endf_report",
      entity_value: report.report_number,
      display_text: `Inquired about ${report.report_number}: "${report.title.slice(0, 60)}"`,
      metadata: { pdf_url: report.pdf_url },
    });
  };

  return (
    <div className="group relative rounded-lg border border-border/40 bg-muted/40 p-6 pb-16 min-h-[280px] transition-all hover:shadow-lg hover:border-border">
      {/* Top row: icon + report_number + date */}
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-base font-bold">
          {searchQuery ? highlightText(report.report_number, searchQuery) : report.report_number}
        </span>
        {report.report_date && (
          <span className="ml-auto text-sm font-medium text-muted-foreground">
            {report.report_date}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-foreground leading-snug mb-3 line-clamp-2">
        {searchQuery ? highlightText(report.title, searchQuery) : report.title}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* Authors */}
        <div className="min-w-0">
          {report.authors && (
            <>
              <span className="text-muted-foreground">Authors</span>
              <p className="font-medium truncate">
                {searchQuery ? highlightText(report.authors, searchQuery) : report.authors}
              </p>
            </>
          )}
        </div>

        {/* Cross Reference */}
        <div className="min-w-0">
          {report.cross_reference && (
            <>
              <span className="text-muted-foreground">Cross Reference</span>
              <p className="font-medium truncate">{report.cross_reference}</p>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar: PDF link left, action buttons right */}
      <div className="absolute bottom-4 left-6 right-4 flex items-center justify-between">
        {report.pdf_url ? (
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-nuclear hover:underline truncate max-w-[60%]"
          >
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            PDF
          </a>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground shadow-lg transition-all hover:scale-110"
            title="Copy report details"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleSendToChat}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-110"
            title="Ask about this ENDF report"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
