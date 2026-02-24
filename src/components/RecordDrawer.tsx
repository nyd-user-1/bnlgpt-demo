import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Hash,
  ExternalLink,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { NsrRecord } from "@/types/nsr";
import { useS2Enrichment } from "@/hooks/useS2Enrichment";

interface RecordDrawerProps {
  records: NsrRecord[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

export function RecordDrawer({
  records,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: RecordDrawerProps) {
  const record = records[currentIndex];
  if (!record) return null;

  const { data: s2, isLoading: s2Loading } = useS2Enrichment(
    open ? record.id : null
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < records.length - 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="pb-0 shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-base">
              {record.key_number}
            </SheetTitle>
            <span className="text-sm text-muted-foreground">
              {record.pub_year}
            </span>

            {/* Prev/next navigation */}
            <button
              onClick={() => hasPrev && onNavigate(currentIndex - 1)}
              disabled={!hasPrev}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => hasNext && onNavigate(currentIndex + 1)}
              disabled={!hasNext}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Open Access badge pushed to right */}
            {s2?.is_open_access && (
              <span className="ml-auto inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
                Open Access
              </span>
            )}
          </div>
          <SheetDescription className="text-foreground font-medium text-sm leading-snug mt-1">
            {record.title}
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto px-4 pb-6 pt-2 flex-1 min-h-0 select-text">
          {/* Loading state */}
          {s2Loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No S2 data */}
          {!s2Loading && (!s2 || s2.s2_lookup_status === "not_found" || s2.s2_lookup_status === "error") && (
            <>
              {/* Tags row (always show) */}
              <div className="py-3 border-b border-border/50">
                <div className="flex flex-wrap gap-2">
                  {record.nuclides?.map((nuc) => (
                    <span key={nuc} className="inline-flex items-center rounded-full bg-nuclear/20 px-2.5 py-0.5 text-[11px] font-medium text-nuclear">{nuc}</span>
                  ))}
                  {record.reactions?.map((rxn) => (
                    <span key={rxn} className="inline-flex items-center rounded-full bg-nuclear/20 px-2.5 py-0.5 text-[11px] font-medium text-nuclear">{rxn}</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground py-4 text-center">
                No Semantic Scholar data available for this record.
              </p>
              {record.doi && (
                <div className="flex justify-center">
                  <a href={`https://doi.org/${record.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-nuclear hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />DOI: {record.doi}
                  </a>
                </div>
              )}
            </>
          )}

          {/* S2 data found */}
          {!s2Loading && s2 && s2.s2_lookup_status === "found" && (
            <>
              {/* Venue + Stats row */}
              <div className="flex items-center gap-3 py-3 border-b border-border/50 text-xs">
                {s2.venue && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {s2.venue}
                    </span>
                    <span className="text-border">|</span>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{s2.citation_count ?? "—"}</span>
                  <span className="text-muted-foreground">citations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{s2.influential_citation_count ?? "—"}</span>
                  <span className="text-muted-foreground">influential</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{s2.reference_count ?? "—"}</span>
                  <span className="text-muted-foreground">references</span>
                </div>
              </div>

              {/* TLDR */}
              {s2.tldr && (
                <div className="py-3 border-b border-border/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    TL;DR
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">
                    {s2.tldr}
                  </p>
                </div>
              )}

              {/* Abstract */}
              {s2.abstract && (
                <div className="py-3 border-b border-border/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Abstract
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s2.abstract}
                  </p>
                </div>
              )}

              {/* Authors with S2 enrichment */}
              {s2.s2_authors && s2.s2_authors.length > 0 && (
                <div className="py-3 border-b border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Authors
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s2.s2_authors.map((author) => (
                      <div
                        key={author.name}
                        className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5"
                      >
                        <span className="text-xs font-medium">{author.name}</span>
                        {author.hIndex != null && author.hIndex > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            h-index: {author.hIndex}
                          </span>
                        )}
                        {author.affiliations?.[0] && (
                          <span className="text-[10px] text-muted-foreground">
                            {author.affiliations[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fields of study + tags */}
              <div className="py-3 border-b border-border/50">
                <div className="flex flex-wrap gap-2">
                  {s2.fields_of_study?.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                    >
                      {field}
                    </span>
                  ))}
                  {record.nuclides?.map((nuc) => (
                    <span
                      key={nuc}
                      className="inline-flex items-center rounded-full bg-nuclear/20 px-2.5 py-0.5 text-[11px] font-medium text-nuclear"
                    >
                      {nuc}
                    </span>
                  ))}
                  {record.reactions?.map((rxn) => (
                    <span
                      key={rxn}
                      className="inline-flex items-center rounded-full bg-nuclear/20 px-2.5 py-0.5 text-[11px] font-medium text-nuclear"
                    >
                      {rxn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action links */}
              <div className="flex items-center gap-3 pt-3">
                {record.doi && (
                  <a
                    href={`https://doi.org/${record.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-nuclear hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    DOI: {record.doi}
                  </a>
                )}
                {s2.is_open_access && s2.open_access_pdf_url && (
                  <a
                    href={s2.open_access_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
