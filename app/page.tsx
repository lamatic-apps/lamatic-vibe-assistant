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
  const [hasPlan, setHasPlan] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string, startGenerating = false) => {
      const userMessage: DisplayMessage = {
        role: "user",
        content: text,
        parsed: null,
      };

      if (!startGenerating) {
        setMessages((prev) => [...prev, userMessage]);
      }
      setIsLoading(true);

      const updatedHistory: ChatMessage[] = [
        ...chatHistory,
        {
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        },
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
        console.log("[v0] Raw API response:", JSON.stringify(data).slice(0, 500));

        // The result can be deeply nested and may be a string or object at various levels
        let rawResult = data?.data?.executeWorkflow?.result;
        console.log("[v0] rawResult type:", typeof rawResult);

        // If rawResult is a string, parse it
        if (typeof rawResult === "string") {
          try {
            rawResult = JSON.parse(rawResult);
          } catch {
            // leave as string
          }
        }

        // Now check if there's a .response key inside
        let innerResult = rawResult?.response ?? rawResult;
        console.log("[v0] innerResult type:", typeof innerResult);

        // If innerResult is still a string, try parsing
        if (typeof innerResult === "string") {
          try {
            innerResult = JSON.parse(innerResult);
          } catch {
            // leave as string
          }
        }

        let parsed: AssistantResponse | null = null;
        let assistantContent = "";

        if (innerResult && typeof innerResult === "object" && innerResult.message) {
          parsed = innerResult as AssistantResponse;
          console.log("[v0] Parsed response - stage:", parsed.stage, "mermaid:", !!parsed.mermaid, "questions:", parsed.questions?.length);
        } else if (typeof innerResult === "string") {
          assistantContent = innerResult;
        } else {
          assistantContent = JSON.stringify(rawResult);
        }

        if (parsed) {
          assistantContent = parsed.message;

          if (parsed.mermaid) {
            setLatestMermaid(parsed.mermaid);
            setShowDiagram(true);
          }

          if (parsed.stage === "planning" && parsed.plan) {
            setHasPlan(true);
          }

          if (parsed.stage === "building") {
            setIsBuilding(true);
          }
        }

        const assistantDisplayMessage: DisplayMessage = {
          role: "assistant",
          content: assistantContent || "No response received.",
          parsed,
        };

        setMessages((prev) => [...prev, assistantDisplayMessage]);

        setChatHistory([
          ...updatedHistory,
          {
            role: "assistant",
            content: assistantContent,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("[v0] Send message error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
            parsed: {
              stage: "error",
              message: "Something went wrong. Please try again.",
              mermaid: "",
              flow_yaml: "",
              questions: [],
            },
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatHistory]
  );

  const handleStartBuilding = () => {
    const lastUserMsg =
      chatHistory.filter((m) => m.role === "user").pop()?.content || "";
    sendMessage(lastUserMsg || "Start building", true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatHistory([]);
    setLatestMermaid(null);
    setShowDiagram(false);
    setHasPlan(false);
    setIsBuilding(false);
  };

  const hasMessages = messages.length > 0;

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
          {hasPlan && !isBuilding && (
            <button
              onClick={handleStartBuilding}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Rocket className="h-3.5 w-3.5" />
              Start Building
            </button>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div
          className={`flex flex-1 flex-col transition-all duration-300 ${
            showDiagram && latestMermaid ? "lg:mr-0" : ""
          }`}
        >
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
          >
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
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt input */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-4">
            <div className="mx-auto max-w-2xl">
              <PromptInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* Mermaid diagram panel */}
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
