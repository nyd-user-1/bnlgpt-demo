import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { useChat } from "@/hooks/useChat";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages, loadSession, sessionId } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const loadedSessionRef = useRef<string | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cmd+Shift+O → new chat
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        clearMessages();
        navigate("/");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [clearMessages, navigate]);

  // Load existing session from route param, or clear for new chat
  useEffect(() => {
    if (routeSessionId && routeSessionId !== loadedSessionRef.current) {
      loadedSessionRef.current = routeSessionId;
      loadSession(routeSessionId);
    } else if (!routeSessionId && loadedSessionRef.current) {
      // Navigated to "/" from a session — start fresh
      loadedSessionRef.current = null;
      clearMessages();
    }
  }, [routeSessionId, loadSession, clearMessages]);

  // Update URL when session is created (without remounting)
  useEffect(() => {
    if (sessionId && !routeSessionId && messages.length > 0 && !isLoading) {
      window.history.replaceState(null, "", `/c/${sessionId}`);
    }
  }, [sessionId, routeSessionId, messages.length, isLoading]);

  // Auto-submit from URL params (from reference card click)
  useEffect(() => {
    if (autoSubmitted || routeSessionId) return;

    const prompt = searchParams.get("prompt");
    const context = searchParams.get("context");
    const url = searchParams.get("url");

    if (prompt) {
      setAutoSubmitted(true);

      let systemContext =
        "You are NSRgpt, an AI research assistant specializing in nuclear science. " +
        "You help researchers explore Nuclear Science References (NSR) from the " +
        "National Nuclear Data Center (NNDC) at Brookhaven National Laboratory.";

      if (context) {
        systemContext +=
          "\n\nThe user is asking about a specific nuclear science reference. " +
          "Here is the record data:\n" +
          context;
      }

      if (url) {
        systemContext +=
          "\n\nThe paper is available at: " +
          url +
          "\nPlease reference this DOI link in your response and provide a thorough " +
          "analysis of the paper's content, methodology, and significance.";
      }

      systemContext +=
        "\n\nProvide a detailed, expert-level analysis. Include relevant nuclear physics " +
        "context, explain the significance of the research, and highlight connections " +
        "to related work in the field.";

      sendMessage(prompt, systemContext, url || undefined);
      navigate("/", { replace: true });
    }
  }, [searchParams, autoSubmitted, routeSessionId, sendMessage, navigate]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {hasMessages ? (
        <>
          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[720px] px-4 py-8">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                  sources={msg.sources}
                  pdfUrl={msg.pdfUrl}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input pinned to bottom */}
          <div className="px-4 py-4 shrink-0 bg-background">
            <ChatInput
              onSubmit={(text) => sendMessage(text)}
              onStop={stopGeneration}
              isLoading={isLoading}
            />
          </div>
        </>
      ) : (
        /* Empty state — input vertically centered */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <ChatInput
            onSubmit={(text) => sendMessage(text)}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
