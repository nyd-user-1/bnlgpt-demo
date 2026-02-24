export interface EndfReport {
  id: number;
  seq_number: number;
  report_number: string;
  authors: string | null;
  title: string;
  report_date: string | null;
  cross_reference: string | null;
  pdf_url: string | null;
}
