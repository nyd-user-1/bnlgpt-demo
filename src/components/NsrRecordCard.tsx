import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NsrRecord } from "@/types/nsr";

interface NsrRecordCardProps {
  record: NsrRecord;
}

export function NsrRecordCard({ record }: NsrRecordCardProps) {
  const similarityPct = record.similarity
    ? Math.round(record.similarity * 100)
    : null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{record.title}</CardTitle>
          {similarityPct !== null && (
            <Badge variant="nuclear" className="shrink-0">
              {similarityPct}%
            </Badge>
          )}
        </div>
        {record.authors && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {record.authors}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{record.key_number}</Badge>
          <Badge variant="outline">{record.pub_year}</Badge>
          {record.reference && (
            <span className="text-muted-foreground">{record.reference}</span>
          )}
        </div>
        {record.keywords && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-3">
            {record.keywords}
          </p>
        )}
        {record.doi && (
          <a
            href={`https://doi.org/${record.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-nuclear hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {record.doi}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
