import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Square } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

export function ChatInput({ onSubmit, isLoading, initialValue }: ChatInputProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = 144; // ~6 lines
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, maxHeight) + "px";
      textareaRef.current.style.overflowY =
        textareaRef.current.scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-[720px] mx-auto w-full">
      <div className="rounded-2xl bg-[#fafafa] border-0 p-3 shadow-lg">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you researching?"
          rows={1}
          className="flex-1 min-h-[40px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60 text-base text-black outline-none"
        />

        {/* Bottom row: + button, model label, send button */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:bg-[#e8e8e8] hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">GPT-4o</span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() && !isLoading}
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                isLoading
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-foreground hover:bg-foreground/90 text-background"
              } disabled:opacity-30`}
            >
              {isLoading ? (
                <Square className="h-4 w-4" fill="currentColor" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
