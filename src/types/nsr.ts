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
  similarity?: number;
}
