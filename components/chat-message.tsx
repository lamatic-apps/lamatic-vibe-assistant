"use client";

import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const stage = parsed?.stage;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {stage && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {stage}
            </span>
          </div>
        )}

        <div className="rounded-2xl rounded-tl-sm bg-secondary/60 border border-border px-5 py-4">
          <div className="prose-chat text-sm leading-relaxed text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-foreground/80">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 last:mb-0 space-y-1 list-disc list-inside text-foreground/90">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 last:mb-0 space-y-1 list-decimal list-inside text-foreground/90">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground/90">{children}</li>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="my-3 overflow-x-auto rounded-lg bg-background border border-border p-3">
                        <code className="text-xs font-mono text-foreground/90">
                          {children}
                        </code>
                      </pre>
                    );
                  }
                  return (
                    <code className="rounded bg-background/80 border border-border/50 px-1.5 py-0.5 text-xs font-mono text-primary">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/40 pl-3 my-3 text-foreground/70 italic">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-3 border-border" />,
              }}
            >
              {displayMessage}
            </ReactMarkdown>
          </div>
        </div>

        {questions.length > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-primary">
              Questions to clarify:
            </p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {questions.map((q, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground"
                >
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
