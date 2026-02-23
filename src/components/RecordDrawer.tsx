import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Hash,
  FileText,
  Quote,
  BookOpen,
  ExternalLink,
  Users,
  Award,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { NsrRecord } from "@/types/nsr";

interface RecordDrawerProps {
  records: NsrRecord[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

// Dummy S2 enrichment data — will be replaced with real API calls
const DUMMY_S2 = {
  abstract:
    "We present new measurements of the neutron-induced fission cross sections for actinide targets using a time-of-flight technique at the CERN n_TOF facility. The results provide improved accuracy in the resonance region and extend coverage to previously unmeasured energy ranges. These data are essential for next-generation reactor design, nuclear waste transmutation studies, and astrophysical nucleosynthesis models. Our measurements resolve long-standing discrepancies between previous datasets and demonstrate the importance of high-resolution cross-section data for nuclear technology applications.",
  tldr: "New high-resolution neutron fission cross-section measurements at CERN n_TOF resolve prior data discrepancies and improve nuclear reactor and waste transmutation modeling.",
  citationCount: 127,
  influentialCitationCount: 23,
  referenceCount: 45,
  isOpenAccess: true,
  openAccessPdfUrl: "https://arxiv.org/pdf/2301.12345",
  fieldsOfStudy: ["Physics", "Nuclear Physics"],
  venue: "Physical Review C",
  publicationDate: "2025-03-15",
  authors: [
    { name: "J.-B.Valentin", hIndex: 34, affiliations: ["CEA Saclay"] },
    { name: "M.Frat", hIndex: 28, affiliations: ["CERN"] },
    { name: "A.Kowalski", hIndex: 19, affiliations: ["JINR Dubna"] },
  ],
};

export function RecordDrawer({
  records,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: RecordDrawerProps) {
  const record = records[currentIndex];
  if (!record) return null;

  const s2 = DUMMY_S2;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < records.length - 1;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[75vh]">
        <DrawerHeader className="pb-0">
          <div className="flex items-center gap-2">
            {/* Prev/next navigation */}
            <button
              onClick={() => hasPrev && onNavigate(currentIndex - 1)}
              disabled={!hasPrev}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <Hash className="h-4 w-4 text-muted-foreground" />
            <DrawerTitle className="text-base">
              {record.key_number}
            </DrawerTitle>
            <span className="text-sm text-muted-foreground">
              {record.pub_year}
            </span>

            <button
              onClick={() => hasNext && onNavigate(currentIndex + 1)}
              disabled={!hasNext}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Badges pushed to right */}
            <div className="ml-auto flex items-center gap-2">
              {s2.venue && (
                <span className="inline-flex items-center rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {s2.venue}
                </span>
              )}
              {s2.isOpenAccess && (
                <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
                  Open Access
                </span>
              )}
            </div>
          </div>
          <DrawerDescription className="text-foreground font-medium text-sm leading-snug mt-1">
            {record.title}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6 pt-2">
          {/* Stats row */}
          <div className="flex items-center gap-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs">
              <Quote className="h-3.5 w-3.5 text-nuclear" />
              <span className="font-semibold">{s2.citationCount}</span>
              <span className="text-muted-foreground">citations</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Award className="h-3.5 w-3.5 text-blue-400" />
              <span className="font-semibold">{s2.influentialCitationCount}</span>
              <span className="text-muted-foreground">influential</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{s2.referenceCount}</span>
              <span className="text-muted-foreground">references</span>
            </div>
          </div>

          {/* TLDR */}
          {s2.tldr && (
            <div className="py-3 border-b border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-nuclear" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  TL;DR
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {s2.tldr}
              </p>
            </div>
          )}

          {/* Abstract */}
          {s2.abstract && (
            <div className="py-3 border-b border-border/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Abstract
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s2.abstract}
              </p>
            </div>
          )}

          {/* Authors with S2 enrichment */}
          <div className="py-3 border-b border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Authors
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {s2.authors.map((author) => (
                <div
                  key={author.name}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5"
                >
                  <span className="text-xs font-medium">{author.name}</span>
                  {author.hIndex > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      h-index: {author.hIndex}
                    </span>
                  )}
                  {author.affiliations[0] && (
                    <span className="text-[10px] text-muted-foreground">
                      {author.affiliations[0]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fields of study + tags */}
          <div className="py-3 border-b border-border/50">
            <div className="flex flex-wrap gap-2">
              {s2.fieldsOfStudy.map((field) => (
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
            {s2.isOpenAccess && s2.openAccessPdfUrl && (
              <a
                href={s2.openAccessPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
