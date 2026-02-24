export interface Database {
  public: {
    Tables: {
      nsr: {
        Row: {
          id: number;
          key_number: string;
          pub_year: number;
          reference: string | null;
          authors: string | null;
          title: string;
          doi: string | null;
          exfor_keys: string | null;
          keywords: string | null;
          nuclides: string[] | null;
          reactions: string[] | null;
          z_values: number[] | null;
          created_at: string;
          embedding: number[] | null;
        };
        Insert: Omit<Database["public"]["Tables"]["nsr"]["Row"], "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["nsr"]["Insert"]>;
        Relationships: [];
      };
      exfor_entries: {
        Row: {
          exfor_id: string;
          title: string | null;
          doi: string | null;
          targets: string[] | null;
          processes: string[] | null;
          observables: string[] | null;
          year: number | null;
          facility: string | null;
          num_datasets: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exfor_entries"]["Row"], "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exfor_entries"]["Insert"]>;
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          title: string;
          messages: PersistedMessage[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          messages?: PersistedMessage[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_sessions"]["Insert"]>;
        Relationships: [];
      };
      endf_reports: {
        Row: {
          id: number;
          seq_number: number;
          report_number: string;
          authors: string | null;
          title: string;
          report_date: string | null;
          report_date_parsed: string | null;
          cross_reference: string | null;
          pdf_url: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["endf_reports"]["Row"], "id"> & {
          id?: number;
        };
        Update: Partial<Database["public"]["Tables"]["endf_reports"]["Insert"]>;
        Relationships: [];
      };
      research_feed: {
        Row: {
          id: string;
          event_type: string;
          category: string;
          entity_type: string | null;
          entity_value: string | null;
          display_text: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          category?: string;
          entity_type?: string | null;
          entity_value?: string | null;
          display_text: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_feed"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_nsr_records: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          filter_year?: number;
        };
        Returns: {
          id: number;
          key_number: string;
          pub_year: number;
          reference: string | null;
          authors: string | null;
          title: string;
          doi: string | null;
          exfor_keys: string | null;
          keywords: string | null;
          similarity: number;
        }[];
      };
      insert_feed_event: {
        Args: {
          p_event_type: string;
          p_category?: string;
          p_entity_type?: string | null;
          p_entity_value?: string | null;
          p_display_text?: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      search_nsr_structured: {
        Args: {
          p_nuclides?: string[] | null;
          p_reactions?: string[] | null;
          p_z_min?: number | null;
          p_z_max?: number | null;
          p_year_min?: number | null;
          p_year_max?: number | null;
          p_limit?: number;
        };
        Returns: {
          id: number;
          key_number: string;
          pub_year: number;
          reference: string | null;
          authors: string | null;
          title: string;
          doi: string | null;
          exfor_keys: string | null;
          keywords: string | null;
          nuclides: string[] | null;
          reactions: string[] | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: {
    nsr: Array<{ key_number: string; title: string; doi?: string | null; similarity: number }>;
    s2: Array<{ title: string; url: string; authors: string; citations: number }>;
  };
}
