import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, FlaskConical } from "lucide-react";
import type { NsrRecord } from "@/types/nsr";

interface NsrRecordCardProps {
  record: NsrRecord;
}

export const NsrRecordCard = memo(function NsrRecordCard({ record }: NsrRecordCardProps) {
  const navigate = useNavigate();

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
      onClick={() => navigate(`/r/${record.key_number}`)}
      className="group relative rounded-lg border bg-muted/40 p-6 min-h-[220px] transition-shadow hover:shadow-lg cursor-pointer"
    >
      {/* Top row: BNL logo + key number + year */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src="/bnl-logo.png"
          alt="BNL"
          className="h-6 w-6 rounded-full object-cover"
        />
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
        {/* Row 1: Authors (col-span-2) */}
        {record.authors && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Authors</span>
            <p className="font-medium truncate">{record.authors}</p>
          </div>
        )}

        {/* Row 2: Reference (col-span-2) */}
        {record.reference && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Reference</span>
            <p className="font-medium truncate">{record.reference}</p>
          </div>
        )}

        {/* Row 3: DOI (col 1) | EXFOR badges (col 2) */}
        {(record.doi || record.exfor_keys) && (
          <>
            <div>
              {record.doi && (
                <>
                  <span className="text-muted-foreground">DOI</span>
                  <p className="font-medium">
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
                </>
              )}
            </div>
            <div>
              {(() => {
                const keys = record.exfor_keys
                  ? record.exfor_keys.split(";").map((k) => k.trim()).filter(Boolean)
                  : [];
                if (keys.length === 0) return null;
                return (
                  <>
                    <span className="text-muted-foreground">EXFOR</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {keys.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 rounded-full bg-nuclear/10 px-2 py-0.5 text-[11px] font-medium text-nuclear"
                        >
                          <FlaskConical className="h-3 w-3" />
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        )}

      </div>

      {/* Send to chat button */}
      <button
        onClick={handleSendToChat}
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
        title="Ask NSRgpt about this reference"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
});
