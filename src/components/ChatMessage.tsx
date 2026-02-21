import ReactMarkdown from "react-markdown";
import { ChatResponseFooter } from "./ChatResponseFooter";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="bg-muted/40 rounded-lg p-4 border-0 max-w-[70%]">
          <p className="text-base leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 max-w-[720px]">
      <div className="space-y-3 text-base">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed text-foreground">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-semibold mb-3 text-foreground">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mb-2 text-foreground">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-2 text-foreground">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-semibold mb-1 text-foreground">
                {children}
              </h4>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-foreground text-sm">{children}</li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && !content && (
          <span className="inline-block w-1.5 h-4 bg-foreground animate-pulse" />
        )}
      </div>
      <ChatResponseFooter content={content} isStreaming={isStreaming} />
    </div>
  );
}
