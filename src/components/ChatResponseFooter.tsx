import { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ChatResponseFooterProps {
  content: string;
  isStreaming?: boolean;
}

export function ChatResponseFooter({
  content,
  isStreaming = false,
}: ChatResponseFooterProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"good" | "bad" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isStreaming) return null;

  return (
    <div className="flex items-center gap-1 pt-3 border-t animate-in fade-in duration-300">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Copy response"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>

      {/* Thumbs Up / Down */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setFeedback(feedback === "good" ? null : "good")}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
            feedback === "good"
              ? "text-green-600 hover:text-green-600 hover:bg-green-50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Good response"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => setFeedback(feedback === "bad" ? null : "bad")}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
            feedback === "bad"
              ? "text-red-500 hover:text-red-500 hover:bg-red-50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Bad response"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
