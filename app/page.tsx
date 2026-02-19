"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Rocket, X, Workflow, Plus } from "lucide-react";
import { PromptInput } from "@/components/prompt-input";
import { ChatMessageBubble } from "@/components/chat-message";
import type { ChatMessage, AssistantResponse } from "@/lib/types";

const MermaidDiagram = dynamic(
  () =>
    import("@/components/mermaid-diagram").then((mod) => mod.MermaidDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
        Loading diagram...
      </div>
    ),
  }
);

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  parsed: AssistantResponse | null;
}

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestMermaid, setLatestMermaid] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  // Tracks formatted answers from QuestionRenderer so the chat box
  // can combine them with any extra typed text on send.
  const [pendingAnswers, setPendingAnswers] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string, startGenerating = false) => {
      if (!startGenerating) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: text, parsed: null },
        ]);
      }
      setIsLoading(true);

      const updatedHistory: ChatMessage[] = [
        ...chatHistory,
        { role: "user", content: text, timestamp: new Date().toISOString() },
      ];

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatMessage: text,
            chatHistory: updatedHistory,
            startGenerating: startGenerating ? "true" : "false",
          }),
        });

        const data = await res.json();
        console.log("[vibe] Raw API response:", JSON.stringify(data).slice(0, 500));

        let rawResult = data?.data?.executeWorkflow?.result;

        if (typeof rawResult === "string") {
          try { rawResult = JSON.parse(rawResult); } catch { /* leave */ }
        }

        let innerResult = rawResult?.response ?? rawResult;

        if (typeof innerResult === "string") {
          try { innerResult = JSON.parse(innerResult); } catch { /* leave */ }
        }

        let parsed: AssistantResponse | null = null;
        let assistantContent = "";

        if (innerResult && typeof innerResult === "object" && innerResult.message) {
          parsed = innerResult as AssistantResponse;
          console.log("[vibe] Parsed — stage:", parsed.stage, "confidence:", parsed.confidence, "plan:", !!parsed.plan, "questions:", parsed.questions?.length);
        } else if (typeof innerResult === "string") {
          assistantContent = innerResult;
        } else {
          assistantContent = JSON.stringify(rawResult);
        }

        if (parsed) {
          assistantContent = parsed.message;

          // Track latest confidence for gating the Start Building button
          if (typeof parsed.confidence === "number") {
            setConfidence(parsed.confidence);
          }

          // Keep latest mermaid in the side panel as a larger view
          if (parsed.mermaid) {
            setLatestMermaid(parsed.mermaid);
            setShowDiagram(true);
          }

          if (parsed.stage === "building") {
            setIsBuilding(true);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantContent || "No response received.",
            parsed,
          },
        ]);

        // Store the full structured JSON so codeNode_342 can re-extract
        // the plan, mermaid, and questions on subsequent turns.
        // The Input Processor parses this JSON and uses `.message` for
        // the human-readable conversation context.
        setChatHistory([
          ...updatedHistory,
          {
            role: "assistant",
            content: parsed ? JSON.stringify(parsed) : assistantContent,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("[vibe] Send message error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
            parsed: {
              stage: "error",
              message: "Something went wrong. Please try again.",
              confidence: 0,
            },
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatHistory]
  );

  // Called when user submits answers via the "Send Answers" button directly
  const handleAnswer = useCallback(
    (formattedAnswer: string) => {
      setPendingAnswers(null);
      sendMessage(formattedAnswer, false);
    },
    [sendMessage]
  );

  // Called whenever QuestionRenderer selection changes — keeps pendingAnswers in sync
  const handleAnswersChange = useCallback((formatted: string | null) => {
    setPendingAnswers(formatted);
  }, []);

  // Chat-box send: if questions have been (partially/fully) answered,
  // prepend those answers so the Planner gets the full picture.
  const handleChatSend = useCallback(
    (text: string) => {
      if (pendingAnswers) {
        const combined = text.trim()
          ? `${pendingAnswers}\n\nAdditional context: ${text.trim()}`
          : pendingAnswers;
        setPendingAnswers(null);
        sendMessage(combined, false);
      } else {
        sendMessage(text, false);
      }
    },
    [pendingAnswers, sendMessage]
  );

  const handleStartBuilding = () => {
    const lastUserMsg =
      chatHistory.filter((m) => m.role === "user").pop()?.content || "";
    sendMessage(lastUserMsg || "Build it", true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatHistory([]);
    setLatestMermaid(null);
    setShowDiagram(false);
    setConfidence(0);
    setIsBuilding(false);
    setPendingAnswers(null);
  };

  const hasMessages = messages.length > 0;
  const canBuild = confidence >= 0.7 && !isBuilding;

  // Index of the last assistant message (for interactive questions)
  const lastAssistantIdx = messages.reduce(
    (last, msg, i) => (msg.role === "assistant" ? i : last),
    -1
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Workflow className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">
            Lamatic Vibe Assistant
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </button>
          )}
          {latestMermaid && !showDiagram && (
            <button
              onClick={() => setShowDiagram(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30"
            >
              Show Diagram
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center px-4">
                <div className="max-w-lg text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Workflow className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground text-balance">
                    What do you want to build?
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Describe the AI workflow, chatbot, or automation you have in
                    mind and I will plan it out for you.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
                {messages.map((msg, i) => (
                  <ChatMessageBubble
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    parsed={msg.parsed}
                    isLatest={i === lastAssistantIdx}
                    onAnswer={i === lastAssistantIdx ? handleAnswer : undefined}
                    onAnswersChange={i === lastAssistantIdx ? handleAnswersChange : undefined}
                  />
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
                      <Workflow className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-secondary/60 border border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isBuilding ? "Building your flow..." : "Thinking..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Building CTA + Prompt input */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 pt-3 pb-4">
            <div className="mx-auto max-w-2xl space-y-3">

              {/* Confidence progress bar — visible while planning, below threshold */}
              {hasMessages && !isBuilding && confidence > 0 && confidence < 0.7 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/40 transition-all duration-500"
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {Math.round(confidence * 100)}% ready to build
                  </span>
                </div>
              )}

              {/* Big Start Building button — appears above input when plan is ready */}
              {canBuild && (
                <button
                  onClick={handleStartBuilding}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="h-4 w-4" />
                  Start Building
                </button>
              )}

              <PromptInput
                onSend={handleChatSend}
                isLoading={isLoading}
                placeholder={
                  pendingAnswers
                    ? "Add extra context (optional) and press Enter to send with your answers..."
                    : "Describe the AI workflow you want to build..."
                }
              />
            </div>
          </div>
        </div>

        {/* Mermaid side panel — full-size view of latest diagram */}
        {showDiagram && latestMermaid && (
          <div className="hidden lg:flex w-[380px] flex-col border-l border-border bg-card/50">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Flow Diagram
              </h3>
              <button
                onClick={() => setShowDiagram(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
                aria-label="Close diagram panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MermaidDiagram chart={latestMermaid} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
