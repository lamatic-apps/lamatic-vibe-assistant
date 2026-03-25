"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { Question, QuestionOption } from "@/lib/types";

interface QuestionRendererProps {
  questions: Question[];
  onSubmit: (formattedAnswer: string) => void;
  // Called whenever answer state changes — lets the parent combine
  // these answers with chat-box text on send. null = not all answered yet.
  onAnswersChange?: (formatted: string | null) => void;
  disabled?: boolean;
}

interface AnswerState {
  [questionId: string]: string | string[];
}

export function QuestionRenderer({
  questions,
  onSubmit,
  onAnswersChange,
  disabled = false,
}: QuestionRendererProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => {
    const ans = answers[q.id];
    if (q.type === "multi_select") return Array.isArray(ans) && ans.length > 0;
    return typeof ans === "string" && ans.trim().length > 0;
  });

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultiToggle = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [questionId]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const handleText = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Bubble current selections up to the parent so it can combine them
  // with chat-box text when the user presses Enter there instead.
  useEffect(() => {
    if (!onAnswersChange || submitted || disabled) return;

    if (!allAnswered) {
      onAnswersChange(null);
      return;
    }

    const parts = questions.map((q) => {
      const ans = answers[q.id];
      let answerText = "";
      if (q.type === "multi_select" && Array.isArray(ans)) {
        const labels = ans.map((v) => {
          const opt = q.options?.find((o) => o.value === v);
          return opt ? opt.label : v;
        });
        answerText = labels.join(", ");
      } else if (q.type === "select" && typeof ans === "string") {
        const opt = q.options?.find((o) => o.value === ans);
        answerText = opt ? opt.label : ans;
      } else {
        answerText = (ans as string) || "";
      }
      return `${q.text}: ${answerText}`;
    });

    onAnswersChange(parts.join("\n"));
  }, [answers, allAnswered, submitted, disabled, questions, onAnswersChange]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || submitted || disabled) return;

    const parts = questions.map((q) => {
      const ans = answers[q.id];
      let answerText = "";

      if (q.type === "multi_select" && Array.isArray(ans)) {
        const labels = ans.map((v) => {
          const opt = q.options?.find((o) => o.value === v);
          return opt ? opt.label : v;
        });
        answerText = labels.join(", ");
      } else if (q.type === "select" && typeof ans === "string") {
        const opt = q.options?.find((o) => o.value === ans);
        answerText = opt ? opt.label : ans;
      } else {
        answerText = (ans as string) || "";
      }

      return `${q.text}: ${answerText}`;
    });

    setSubmitted(true);
    onAnswersChange?.(null); // clear pending answers in parent
    onSubmit(parts.join("\n"));
  }, [allAnswered, submitted, disabled, questions, answers, onSubmit]);

  // Keyboard shortcuts: 1/2/3 for select questions (only when one select visible)
  useEffect(() => {
    if (submitted || disabled) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const num = parseInt(e.key, 10);
      if (isNaN(num) || num < 1) return;

      // Apply to first unanswered select question
      const selectQ = questions.find(
        (q) => q.type === "select" && !answers[q.id]
      );
      if (selectQ && selectQ.options) {
        const opt = selectQ.options[num - 1];
        if (opt) handleSelect(selectQ.id, opt.value);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [questions, answers, submitted, disabled]);

  if (submitted) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Answers submitted</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 space-y-2.5">
          <p className="text-sm font-medium text-foreground">{q.text}</p>

          {q.type === "select" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, idx) => (
                <SelectOption
                  key={opt.value}
                  opt={opt}
                  index={idx}
                  selected={answers[q.id] === opt.value}
                  disabled={disabled}
                  onSelect={() => handleSelect(q.id, opt.value)}
                />
              ))}
            </div>
          )}

          {q.type === "multi_select" && q.options && (
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const selected =
                  ((answers[q.id] as string[]) || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMultiToggle(q.id, opt.value)}
                    disabled={disabled}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {selected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "text" && (
            <input
              type="text"
              value={(answers[q.id] as string) || ""}
              onChange={(e) => handleText(q.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={`Type your answer...`}
              disabled={disabled}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || disabled}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Send Answers
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SelectOption({
  opt,
  index,
  selected,
  disabled,
  onSelect,
}: {
  opt: QuestionOption;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground group-hover:border-primary/40"
        }`}
      >
        {index + 1}
      </span>
      <div className="text-left">
        <span className="font-medium">{opt.label}</span>
        {opt.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
        )}
      </div>
    </button>
  );
}
