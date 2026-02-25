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
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
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
      <SheetContent side="right" showCloseButton={false} className="flex flex-col">
        <SheetHeader className="pb-0 shrink-0 pr-4">
          {/* Navigation row */}
          <div className="flex items-center gap-1">
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

            <button
              onClick={() => onOpenChange(false)}
              className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted opacity-70 hover:opacity-100 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Key number */}
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-base">
              {record.key_number}
            </SheetTitle>
          </div>

          {/* Open Access badge */}
          {s2?.is_open_access && (
            <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-medium text-green-400 w-fit">
              Open Access
            </span>
          )}

          <div className="mt-1">
            <span className="text-xs text-muted-foreground block mb-0.5">Title</span>
            <SheetDescription className="text-foreground font-medium text-sm leading-snug">
              {record.title}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto px-4 pb-6 pt-2 flex-1 min-h-0 select-text">
          {/* Loading state */}
          {s2Loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!s2Loading && (() => {
            const s2Found = s2 && s2.s2_lookup_status === "found";

            return (
              <>
                {/* Venue/Journal (S2 only) */}
                {s2Found && s2.venue && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Journal</span>
                    <p className="text-sm font-medium">{s2.venue}</p>
                  </div>
                )}

                {/* TLDR (S2 only) */}
                {s2Found && s2.tldr && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">TL;DR</span>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{s2.tldr}</p>
                  </div>
                )}

                {/* Abstract (S2 only) */}
                {s2Found && s2.abstract && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Abstract</span>
                    <p className="text-sm font-medium text-foreground/80 leading-relaxed">{s2.abstract}</p>
                  </div>
                )}

                {/* Year */}
                <div className="py-3 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Year</span>
                  <p className="text-sm font-medium">{record.pub_year}</p>
                </div>

                {/* Authors — prefer S2 authors (with h-index), fall back to base record */}
                {s2Found && s2.s2_authors && s2.s2_authors.length > 0 ? (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1.5">Authors</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s2.s2_authors.map((author) => {
                        const hasExtra = (author.hIndex != null && author.hIndex > 0) || author.affiliations?.[0];
                        return (
                          <span
                            key={author.name}
                            className={`inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 text-xs ${hasExtra ? "px-2.5 py-1" : "px-2 py-0.5"}`}
                          >
                            <span className="font-medium">{author.name}</span>
                            {author.hIndex != null && author.hIndex > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                h:{author.hIndex}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : record.authors && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Authors</span>
                    <p className="text-sm font-medium">{record.authors}</p>
                  </div>
                )}

                {/* Citations / Influential / References (S2 only, after authors) */}
                {s2Found && (
                  <div className="py-3 border-b border-border/50 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground">Citations</span>
                        <p className="font-medium">{s2.citation_count ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Influential</span>
                        <p className="font-medium">{s2.influential_citation_count ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">References</span>
                        <p className="font-medium">{s2.reference_count ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference (always from base record) */}
                {record.reference && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Reference</span>
                    <p className="text-sm font-medium">{record.reference}</p>
                  </div>
                )}

                {/* Nuclides (with label, matching card pattern) */}
                {record.nuclides && record.nuclides.length > 0 && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Nuclides</span>
                    <div className="flex flex-wrap gap-1.5">
                      {record.nuclides.map((nuc) => (
                        <span
                          key={nuc}
                          className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                        >
                          {nuc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reactions (with label, matching card pattern) */}
                {record.reactions && record.reactions.length > 0 && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Reactions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {record.reactions.map((rxn) => (
                        <span
                          key={rxn}
                          className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                        >
                          {rxn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fields of study (S2 only) */}
                {s2Found && s2.fields_of_study && s2.fields_of_study.length > 0 && (
                  <div className="py-3 border-b border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Fields of Study</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s2.fields_of_study.map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No S2 data message */}
                {!s2Found && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No Semantic Scholar data available for this record.
                  </p>
                )}

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
                  {s2Found && s2.is_open_access && s2.open_access_pdf_url && (
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
            );
          })()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
