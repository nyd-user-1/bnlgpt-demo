import { useQuery } from "@tanstack/react-query";

/** Convert LaTeX-style math notation to readable text. */
function cleanLatex(raw: string): string {
  return raw
    .replace(/\$\^{(\d+)}\$/g, "$1")
    .replace(/\$_\{([^}]+)}\$/g, "$1")
    .replace(/\$\\alpha\$/g, "\u03B1")
    .replace(/\\alpha/g, "\u03B1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\textit\{([^}]+)}/g, "$1")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .trim();
}

async function fetchBatch(
  dois: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (dois.length === 0) return result;

  // Semantic Scholar batch endpoint: max 500 IDs per request
  const BATCH_SIZE = 500;

  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    const chunk = dois.slice(i, i + BATCH_SIZE);
    const ids = chunk.map((d) => `DOI:${d}`);

    try {
      const res = await fetch(
        "https://api.semanticscholar.org/graph/v1/paper/batch?fields=abstract,externalIds",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        },
      );

      if (!res.ok) continue;

      const papers: (
        | { externalIds?: { DOI?: string }; abstract?: string | null }
        | null
      )[] = await res.json();

      for (let j = 0; j < papers.length; j++) {
        const paper = papers[j];
        if (!paper?.abstract) continue;
        // Match back to the original DOI (position-aligned with the request)
        const doi = chunk[j];
        if (doi) {
          result.set(doi, cleanLatex(paper.abstract));
        }
      }
    } catch {
      // Silently skip failed batches
    }
  }

  return result;
}

/**
 * Batch-fetch abstracts from Semantic Scholar for a list of DOIs.
 * Returns a Map<doi, abstract> for all DOIs that had an abstract.
 */
export function useBatchAbstracts(dois: string[]) {
  // Sort for stable query key
  const sortedDois = [...dois].sort();

  return useQuery({
    queryKey: ["batch-abstracts", sortedDois],
    queryFn: () => fetchBatch(sortedDois),
    enabled: sortedDois.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}
