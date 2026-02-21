import { useQuery } from "@tanstack/react-query";

export interface CrossRefWork {
  abstract: string | null;
  publisher: string | null;
  subject: string[];
  referencesCount: number | null;
  isReferencedByCount: number | null;
  license: string | null;
  funder: { name: string }[];
}

/** Strip JATS XML tags, converting common ones to HTML equivalents. */
function cleanJatsAbstract(raw: string): string {
  return raw
    .replace(/<jats:title[^>]*>/gi, "<strong>")
    .replace(/<\/jats:title>/gi, "</strong> ")
    .replace(/<jats:p[^>]*>/gi, "<p>")
    .replace(/<\/jats:p>/gi, "</p>")
    .replace(/<jats:italic[^>]*>/gi, "<em>")
    .replace(/<\/jats:italic>/gi, "</em>")
    .replace(/<jats:bold[^>]*>/gi, "<strong>")
    .replace(/<\/jats:bold>/gi, "</strong>")
    .replace(/<jats:sup[^>]*>/gi, "<sup>")
    .replace(/<\/jats:sup>/gi, "</sup>")
    .replace(/<jats:sub[^>]*>/gi, "<sub>")
    .replace(/<\/jats:sub>/gi, "</sub>")
    .replace(/<jats:[^>]+>/gi, "")
    .replace(/<\/jats:[^>]+>/gi, "")
    .trim();
}

/** Convert LaTeX-style math notation to readable Unicode-ish text. */
function cleanLatexAbstract(raw: string): string {
  return raw
    .replace(/\$\^{(\d+)}\$/g, "<sup>$1</sup>")       // $^{18}$ → <sup>18</sup>
    .replace(/\$_\{([^}]+)}\$/g, "<sub>$1</sub>")       // $_{x}$ → <sub>x</sub>
    .replace(/\$\\alpha\$/g, "\u03B1")                   // $\alpha$ → α
    .replace(/\\alpha/g, "\u03B1")
    .replace(/\$([^$]+)\$/g, "$1")                       // strip remaining $ wrappers
    .replace(/\\textit\{([^}]+)}/g, "<em>$1</em>")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .trim();
}

/** Fetch abstract from Semantic Scholar as a fallback. */
async function fetchSemanticScholarAbstract(doi: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=abstract`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.abstract ? cleanLatexAbstract(json.abstract) : null;
  } catch {
    return null;
  }
}

async function fetchCrossRefWork(doi: string): Promise<CrossRefWork> {
  const res = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "BNL-NSR-Explorer/1.0 (mailto:nsr@bnl.gov)",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`CrossRef API error: ${res.status}`);
  }

  const json = await res.json();
  const msg = json.message;

  let abstract: string | null = msg.abstract
    ? cleanJatsAbstract(msg.abstract)
    : null;

  // Fallback to Semantic Scholar if CrossRef has no abstract
  if (!abstract) {
    abstract = await fetchSemanticScholarAbstract(doi);
  }

  return {
    abstract,
    publisher: msg.publisher ?? null,
    subject: msg.subject ?? [],
    referencesCount: msg["references-count"] ?? null,
    isReferencedByCount: msg["is-referenced-by-count"] ?? null,
    license:
      msg.license && msg.license.length > 0 ? msg.license[0].URL : null,
    funder: (msg.funder ?? []).map((f: { name: string }) => ({ name: f.name })),
  };
}

export function useCrossRefWork(doi: string | null) {
  return useQuery({
    queryKey: ["crossref-work", doi],
    queryFn: () => fetchCrossRefWork(doi!),
    enabled: !!doi,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}
