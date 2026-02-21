import type { NsrRecord } from "@/types/nsr";

interface NsrRecordCardProps {
  record: NsrRecord;
}

export function NsrRecordCard({ record }: NsrRecordCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md">
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
      <p className="text-sm text-foreground leading-snug mb-4 line-clamp-3">
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
          <div className="col-span-2">
            <span className="text-muted-foreground">Keywords</span>
            <p className="font-medium line-clamp-2">{record.keywords}</p>
          </div>
        )}
      </div>
    </div>
  );
}
