import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChatSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

async function fetchSessions(): Promise<ChatSessionSummary[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as ChatSessionSummary[];
}

export function useChatSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: fetchSessions,
    staleTime: 1000 * 30,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
  };

  return { ...query, refresh };
}
