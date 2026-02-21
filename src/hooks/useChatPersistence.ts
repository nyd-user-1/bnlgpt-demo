import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PersistedMessage } from "@/integrations/supabase/types";

export interface ChatSessionData {
  id: string;
  title: string;
  messages: PersistedMessage[];
}

export function useChatPersistence() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const createSession = useCallback(
    async (title: string, initialMessages: PersistedMessage[] = []) => {
      setIsSaving(true);
      try {
        const { data, error } = await supabase
          .from("chat_sessions")
          .insert({ title, messages: initialMessages as any })
          .select("id")
          .single();

        if (error) throw error;
        setCurrentSessionId(data.id);
        return data.id;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const updateMessages = useCallback(
    async (sessionId: string, messages: PersistedMessage[]) => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("chat_sessions")
          .update({
            messages: messages as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (error) throw error;
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const loadSession = useCallback(
    async (sessionId: string): Promise<ChatSessionData | null> => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title, messages")
        .eq("id", sessionId)
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        title: data.title,
        messages: (data.messages ?? []) as unknown as PersistedMessage[],
      };
    },
    []
  );

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from("chat_sessions").delete().eq("id", sessionId);
  }, []);

  return {
    currentSessionId,
    setCurrentSessionId,
    isSaving,
    createSession,
    updateMessages,
    loadSession,
    deleteSession,
  };
}
