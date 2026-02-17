"use client";

import { Bot, User } from "lucide-react";
import type { AssistantResponse } from "@/lib/types";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  parsed: AssistantResponse | null;
}

export function ChatMessageBubble({ role, content, parsed }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/20 px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground">{content}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const displayMessage = parsed?.message || content;
  const questions = parsed?.questions || [];
  const confidence = parsed?.confidence;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%] space-y-3">
        <div className="rounded-2xl rounded-tl-sm bg-secondary/60 border border-border px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {displayMessage}
          </p>
        </div>

        {questions.length > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-primary">
              Questions to clarify:
            </p>
            <ul className="space-y-1.5">
              {questions.map((q, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary/70 mt-0.5 text-xs">
                    {i + 1}.
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {confidence !== undefined && confidence > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(confidence * 100)}% confident
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
