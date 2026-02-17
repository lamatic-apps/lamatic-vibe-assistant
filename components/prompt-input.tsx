"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface PromptInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function PromptInput({
  onSend,
  isLoading,
  placeholder = "Describe the AI workflow you want to build...",
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-lg shadow-background/50 transition-colors focus-within:border-primary/40">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="w-full resize-none bg-transparent px-4 pt-4 pb-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground/50 mr-1 hidden sm:inline">
          Press Enter to send
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
