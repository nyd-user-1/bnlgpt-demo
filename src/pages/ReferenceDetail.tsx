import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, ExternalLink, FlaskConical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useNsrRecord } from "@/hooks/useNsrRecord";
import { useExforEntries } from "@/hooks/useExforEntries";
import { useCrossRefWork } from "@/hooks/useCrossRefWork";
import type { ExforEntry } from "@/hooks/useExforEntries";

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  record,
  onSendToChat,
}: {
  record: NonNullable<ReturnType<typeof useNsrRecord>["data"]>;
  onSendToChat: () => void;
}) {
  return (
    <Card className="group bg-card rounded-xl shadow-sm border overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/bnl-logo.png"
              alt="BNL"
              className="w-10 h-10 rounded-full object-cover"
            />
            <CardTitle className="text-xl font-semibold">
              {record.key_number}
            </CardTitle>
          </div>
          <button
            onClick={onSendToChat}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/80 transition-all opacity-0 group-hover:opacity-100"
            title="Send to chat"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-1">Authors</h4>
          <p className="text-sm font-medium">{record.authors || "—"}</p>
        </div>

        {/* Row 1: Year | Reference | DOI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Year</h4>
            <p className="text-sm font-medium">{record.pub_year}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Reference</h4>
            <p className="text-sm font-medium">{record.reference || "—"}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">DOI</h4>
            {record.doi ? (
              <a
                href={`https://doi.org/${record.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-nuclear hover:underline"
              >
                {record.doi}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Row 2: Keywords | Key Number | Year | NSR Online */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Keywords</h4>
            <p className="text-sm leading-relaxed">{record.keywords || "—"}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Key Number</h4>
            <p className="text-sm font-medium">{record.key_number}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Year</h4>
            <p className="text-sm font-medium">{record.pub_year}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">NSR Online</h4>
            <a
              href={`https://www.nndc.bnl.gov/nsr/nsrlink.jsp?${record.key_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-nuclear hover:underline inline-flex items-center gap-1"
            >
              View on NNDC
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {record.title && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {record.title}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Notes Card (Overview tab)                                    */
/* ------------------------------------------------------------------ */

function QuickNotesCard() {
  return (
    <Card className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-lg font-semibold">Quick Notes</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <textarea
          placeholder="Add notes about this reference..."
          className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Notes are not persisted yet.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Abstract Card (CrossRef)                                           */
/* ------------------------------------------------------------------ */

function AbstractCard({ doi }: { doi: string }) {
  const { data, isLoading, error } = useCrossRefWork(doi);

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Abstract</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Abstract</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No abstract available from CrossRef.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-lg font-semibold">Abstract</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data.abstract ? (
          <div
            className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: data.abstract }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No abstract available from CrossRef.
          </p>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
          {data.publisher && <span>Publisher: {data.publisher}</span>}
          {data.isReferencedByCount != null && (
            <span>Citations: {data.isReferencedByCount}</span>
          )}
          {data.referencesCount != null && (
            <span>References: {data.referencesCount}</span>
          )}
          {data.subject.length > 0 && (
            <span>Subjects: {data.subject.join(", ")}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  EXFOR Entry Card                                                   */
/* ------------------------------------------------------------------ */

function ExforEntryCard({ entry }: { entry: ExforEntry }) {
  const pills = (label: string, items: string[] | null) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <h5 className="text-xs text-muted-foreground mb-1">{label}</h5>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="text-[11px]">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-4 w-4 text-nuclear" />
              <span className="font-semibold text-sm">{entry.exfor_id}</span>
            </div>
            {entry.title && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {entry.title}
              </p>
            )}
          </div>
          <a
            href={`https://www-nds.iaea.org/exfor/servlet/X4sSearch5?EntryID=${entry.exfor_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-nuclear hover:underline whitespace-nowrap inline-flex items-center gap-1"
          >
            IAEA Viewer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-2">
          {pills("Targets", entry.targets)}
          {pills("Processes", entry.processes)}
          {pills("Observables", entry.observables)}
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {entry.num_datasets != null && (
            <span>{entry.num_datasets} dataset{entry.num_datasets !== 1 ? "s" : ""}</span>
          )}
          {entry.facility && (
            <span>Facility: {entry.facility}</span>
          )}
          {entry.year && (
            <span>Year: {entry.year}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  EXFOR Data Tab                                                     */
/* ------------------------------------------------------------------ */

function ExforDataTab({ exforKeys }: { exforKeys: string | null }) {
  const { data: entries, isLoading, error } = useExforEntries(exforKeys);

  if (!exforKeys) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No EXFOR keys associated with this reference.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No EXFOR entries found for the associated keys.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {entries.map((entry) => (
        <ExforEntryCard key={entry.exfor_id} entry={entry} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReferenceDetail() {
  const { keyNumber } = useParams<{ keyNumber: string }>();
  const navigate = useNavigate();
  const { data: record, isLoading, error } = useNsrRecord(keyNumber);

  const handleSendToChat = () => {
    if (!record) return;

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

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="px-6 py-6">
        <p className="text-center text-muted-foreground py-12">
          Reference not found.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 h-full overflow-y-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/references")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to References
      </button>

      {/* Summary */}
      <SummaryCard record={record} onSendToChat={handleSendToChat} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full rounded-lg border bg-transparent p-0 h-auto grid grid-cols-2">
          <TabsTrigger
            value="overview"
            className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:shadow-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="exfor"
            className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:shadow-none"
          >
            EXFOR Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {record.doi && <AbstractCard doi={record.doi} />}
          <QuickNotesCard />
        </TabsContent>

        <TabsContent value="exfor">
          <ExforDataTab exforKeys={record.exfor_keys} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
