export interface S2Author {
  name: string;
  hIndex: number | null;
  affiliations: string[];
}

export interface NsrRecord {
  id: number;
  key_number: string;
  pub_year: number;
  reference: string | null;
  authors: string | null;
  title: string;
  doi: string | null;
  exfor_keys: string | null;
  keywords: string | null;
  nuclides?: string[] | null;
  reactions?: string[] | null;
  similarity?: number;
  // S2 enrichment fields
  s2_paper_id?: string | null;
  citation_count?: number | null;
  influential_citation_count?: number | null;
  reference_count?: number | null;
  abstract?: string | null;
  tldr?: string | null;
  venue?: string | null;
  publication_date?: string | null;
  is_open_access?: boolean;
  open_access_pdf_url?: string | null;
  fields_of_study?: string[] | null;
  s2_authors?: S2Author[] | null;
  bibtex?: string | null;
  s2_lookup_status?: "pending" | "found" | "not_found" | "error" | null;
  s2_looked_up_at?: string | null;
}
