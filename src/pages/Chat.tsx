import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { useChat } from "@/hooks/useChat";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-submit from URL params (from reference card click)
  useEffect(() => {
    if (autoSubmitted) return;

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

      sendMessage(prompt, systemContext);

      // Clear URL params
      navigate("/", { replace: true });
    }
  }, [searchParams, autoSubmitted, sendMessage, navigate]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {hasMessages ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input pinned to bottom */}
          <div className="border-t px-4 py-4 shrink-0">
            <ChatInput
              onSubmit={(text) => sendMessage(text)}
              isLoading={isLoading}
            />
          </div>
        </>
      ) : (
        /* Empty state — input centered */
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
