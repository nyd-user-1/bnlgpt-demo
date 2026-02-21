import { useState, useCallback, useRef } from "react";
import { useChatPersistence } from "./useChatPersistence";
import type { PersistedMessage } from "@/integrations/supabase/types";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
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
    }));
}

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
        } catch {
          // continue without persistence
        }
      }

      const apiMessages = [
        ...(systemContext
          ? [{ role: "system" as const, content: systemContext }]
          : [
              {
                role: "system" as const,
                content:
                  "You are BNLgpt, an AI research assistant specializing in nuclear science. " +
                  "You help researchers explore Nuclear Science References (NSR) from the " +
                  "National Nuclear Data Center (NNDC) at Brookhaven National Laboratory. " +
                  "Answer questions about nuclear physics, nuclear reactions, isotopes, " +
                  "decay processes, cross sections, and related topics. Be precise and cite " +
                  "specific references when possible.",
              },
            ]),
        ...messagesRef.current.slice(-10).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: userText },
      ];

      try {
        abortRef.current = new AbortController();

        const res = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: apiMessages,
              stream: true,
              max_tokens: 2048,
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`OpenAI error ${res.status}: ${err}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

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
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: finalContent, isStreaming: false }
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
