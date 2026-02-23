import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowUp, Copy, Check, Hash } from "lucide-react";
import type { NsrRecord } from "@/types/nsr";

interface NsrRecordCardProps {
  record: NsrRecord;
}

export const NsrRecordCard = memo(function NsrRecordCard({ record }: NsrRecordCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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
  };

  return (
    <div
      className="group relative rounded-lg border bg-muted/40 p-6 pb-16 min-h-[280px] transition-shadow hover:shadow-lg"
    >
      {/* Top row: hash icon + key number + year */}
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <span className="text-base font-bold">{record.key_number}</span>
        <span className="ml-auto text-sm font-medium text-muted-foreground">
          {record.pub_year}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-foreground leading-snug mb-3 line-clamp-2">
        {record.title}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* Row 1, Col 1: Authors */}
        <div className="min-w-0">
          {record.authors && (
            <>
              <span className="text-muted-foreground">Authors</span>
              <p className="font-medium truncate">
                {(() => {
                  const names = record.authors.split(";").map((n) => n.trim());
                  if (names.length <= 3) return record.authors;
                  return names.slice(0, 3).join("; ") + "; et al.";
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

        {/* Row 3: DOI (full width) */}
        {record.doi && (
          <div className="col-span-2">
            <span className="text-muted-foreground">DOI</span>
            <p className="font-medium truncate">
              <a
                href={`https://doi.org/${record.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-nuclear hover:underline"
              >
                {record.doi}
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
  );
});
