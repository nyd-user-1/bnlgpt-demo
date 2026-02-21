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
}
