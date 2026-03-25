"use client";

import { useState } from "react";
import { Bot, User, Copy, Check, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantResponse } from "@/lib/types";
import { PlanCard } from "@/components/plan-card";
import { QuestionRenderer } from "@/components/question-renderer";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  parsed: AssistantResponse | null;
  isLatest?: boolean;
  onAnswer?: (formattedAnswer: string) => void;
  onAnswersChange?: (formatted: string | null) => void;
}

export function ChatMessageBubble({
  role,
  content,
  parsed,
  isLatest = false,
  onAnswer,
  onAnswersChange,
}: ChatMessageProps) {
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

  // Determine what to render from parsed response
  const displayMessage = parsed?.message || content;
  const stage = parsed?.stage;
  const plans = parsed?.plans || (parsed?.plan ? [parsed.plan] : undefined);
  const mermaid = parsed?.mermaid;
  const questions = parsed?.questions;
  const flowJsons = parsed?.flow_jsons || (parsed?.flow_json ? [{ name: "Flow", flow_json: parsed.flow_json }] : undefined);
  const confidence = parsed?.confidence;

  if (stage === "building") {
    console.log("[vibe] ChatMessage building stage — flow_jsons count:", flowJsons?.length, "items:", flowJsons?.map(f => f.name));
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
        <Bot className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Stage badge */}
        {stage && stage !== "planning" && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {stage}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="rounded-2xl rounded-tl-sm bg-secondary/60 border border-border px-5 py-4">
          <div className="prose-chat text-sm leading-relaxed text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>
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
                  <ul className="mb-3 last:mb-0 space-y-1 list-disc list-inside text-foreground/90">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 last:mb-0 space-y-1 list-decimal list-inside text-foreground/90">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground/90">{children}</li>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="my-3 overflow-x-auto rounded-lg bg-background border border-border p-3">
                        <code className="text-xs font-mono text-foreground/90">{children}</code>
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
                  <blockquote className="border-l-2 border-primary/40 pl-3 my-3 text-foreground/70 italic">{children}</blockquote>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-3 border-border" />,
              }}
            >
              {displayMessage}
            </ReactMarkdown>
          </div>

          {/* Confidence indicator (subtle, inside bubble) */}
          {typeof confidence === "number" && stage === "planning" && (
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
              <span className="text-[10px] text-muted-foreground">Plan confidence</span>
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    confidence >= 0.7 ? "bg-green-500" : confidence >= 0.5 ? "bg-yellow-500" : "bg-muted-foreground"
                  }`}
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Plan cards — rendered when plans array is present */}
        {plans && plans.length > 0 && plans.map((plan, i) => (
          <PlanCard key={i} plan={plan} mermaid={plans.length === 1 ? mermaid : undefined} />
        ))}

        {/* Interactive questions — only for latest message */}
        {questions && questions.length > 0 && (
          <QuestionRenderer
            questions={questions}
            onSubmit={isLatest && onAnswer ? onAnswer : () => {}}
            onAnswersChange={isLatest ? onAnswersChange : undefined}
            disabled={!isLatest || !onAnswer}
          />
        )}

        {/* JSON panels — rendered when flow_jsons are present (building stage) */}
        {flowJsons && flowJsons.length > 0 && flowJsons.map((item, i) => (
          <YamlPanel
            key={i}
            yaml={typeof item.flow_json === "string" ? item.flow_json : JSON.stringify(item.flow_json, null, 2)}
            name={item.name}
          />
        ))}
      </div>
    </div>
  );
}

function YamlPanel({ yaml, name }: { yaml: string; name?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([yaml], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "lamatic-flow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">{name || "lamatic-flow"}.json</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-auto bg-background p-4">
        <pre className="text-xs font-mono text-foreground/85 whitespace-pre leading-relaxed">
          {yaml}
        </pre>
      </div>
    </div>
  );
}
