import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp } from "lucide-react";
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
    <div className="group relative rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Top row: BNL logo + key number */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src="/bnl-logo.png"
          alt="BNL"
          className="h-6 w-6 rounded-full object-cover"
        />
        <span className="text-base font-bold">{record.key_number}</span>
      </div>

      {/* Title */}
      <p className="text-sm text-foreground leading-snug mb-4 line-clamp-2">
        {record.title}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {record.authors && (
          <>
            <div>
              <span className="text-muted-foreground">Authors</span>
              <p className="font-medium truncate">{record.authors}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year</span>
              <p className="font-medium">{record.pub_year}</p>
            </div>
          </>
        )}
        {!record.authors && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Year</span>
            <p className="font-medium">{record.pub_year}</p>
          </div>
        )}
        {record.reference && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Reference</span>
            <p className="font-medium truncate">{record.reference}</p>
          </div>
        )}
        {record.doi && (
          <div className="col-span-2">
            <span className="text-muted-foreground">DOI</span>
            <p className="font-medium">
              <a
                href={`https://doi.org/${record.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-nuclear hover:underline"
              >
                {record.doi}
              </a>
            </p>
          </div>
        )}
        {record.keywords && (
          <div className="col-span-2 max-w-[calc(100%-3rem)]">
            <span className="text-muted-foreground">Keywords</span>
            <p className="font-medium truncate">{record.keywords}</p>
          </div>
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
