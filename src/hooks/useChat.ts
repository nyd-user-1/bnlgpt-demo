import { useState, useCallback, useRef } from "react";
import { useChatPersistence } from "./useChatPersistence";
import { supabase } from "@/integrations/supabase/client";
import type { PersistedMessage } from "@/integrations/supabase/types";

export interface MessageSources {
  nsr: Array<{
    key_number: string;
    title: string;
    doi?: string | null;
    similarity: number;
  }>;
  s2: Array<{
    title: string;
    url: string;
    authors: string;
    citations: number;
  }>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  sources?: MessageSources;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function toPersistedMessages(msgs: Message[]): PersistedMessage[] {
  return msgs
    .filter((m) => m.content && !m.isStreaming)
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date().toISOString(),
      ...(m.sources ? { sources: m.sources } : {}),
    }));
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const persistence = useChatPersistence();

  const sendMessage = useCallback(
    async (userText: string, systemContext?: string) => {
      const userMsg: Message = {
        id: makeId(),
        role: "user",
        content: userText,
      };

      const assistantMsg: Message = {
        id: makeId(),
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      // Create session on first message
      let sessionId = persistence.currentSessionId;
      if (!sessionId) {
        const title = userText.slice(0, 80);
        try {
          sessionId = await persistence.createSession(title, [
            {
              id: userMsg.id,
              role: "user",
              content: userText,
              timestamp: new Date().toISOString(),
            },
          ]);

          // Fire-and-forget feed event
          supabase
            .rpc("insert_feed_event", {
              p_event_type: "chat_started",
              p_category: "chat",
              p_display_text: `Started chat: "${title}"`,
            })
            .then(() => {}, () => {});
        } catch {
          // continue without persistence
        }
      }

      // Build conversation history for the Edge Function
      const historyMessages = messagesRef.current.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      try {
        abortRef.current = new AbortController();

        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: historyMessages,
              userMessage: userText,
              systemContext: systemContext || undefined,
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Chat error ${res.status}: ${err}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let parsedSources: MessageSources | undefined;
        let isFirstDataLine = true;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);

                // First data event contains sources metadata
                if (isFirstDataLine && parsed.sources) {
                  isFirstDataLine = false;
                  parsedSources = parsed.sources as MessageSources;
                  continue;
                }
                isFirstDataLine = false;

                // Remaining events are OpenAI streaming deltas
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulated += delta;
                  const current = accumulated;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: current, isStreaming: true }
                        : m
                    )
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }

        // Mark streaming complete
        const finalContent = accumulated;
        const finalSources = parsedSources;
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: finalContent,
                  isStreaming: false,
                  sources: finalSources,
                }
              : m
          );

          // Persist completed messages
          if (sessionId) {
            persistence.updateMessages(sessionId, toPersistedMessages(updated));
          }

          return updated;
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: `Error: ${err.message}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [persistence]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      const session = await persistence.loadSession(sessionId);
      if (session) {
        persistence.setCurrentSessionId(session.id);
        setMessages(
          session.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            ...(m.sources ? { sources: m.sources as MessageSources } : {}),
          }))
        );
        return session;
      }
      return null;
    },
    [persistence]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    persistence.setCurrentSessionId(null);
  }, [persistence]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    loadSession,
    sessionId: persistence.currentSessionId,
  };
}
