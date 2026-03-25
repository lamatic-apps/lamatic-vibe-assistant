"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Rocket, X, Workflow, Plus, FileJson, Send } from "lucide-react";
import { PromptInput } from "@/components/prompt-input";
import { ChatMessageBubble } from "@/components/chat-message";
import type { ChatMessage, AssistantResponse } from "@/lib/types";
import { validateN8nInput, buildMigrationMessage } from "@/lib/n8n-migrator";

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

type TabType = "vibe" | "n8n";

interface TabState {
  messages: DisplayMessage[];
  chatHistory: ChatMessage[];
  latestMermaid: string | null;
  showDiagram: boolean;
  confidence: number;
  pendingAnswers: string | null;
  jsonInputPhase?: boolean;
}

const initialTabState = (): TabState => ({
  messages: [],
  chatHistory: [],
  latestMermaid: null,
  showDiagram: false,
  confidence: 0,
  pendingAnswers: null,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("vibe");
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    vibe: initialTabState(),
    n8n: { ...initialTabState(), jsonInputPhase: true },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [n8nJsonRaw, setN8nJsonRaw] = useState("");
  const [n8nError, setN8nError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTabState = tabStates[activeTab];

  const updateCurrentTab = useCallback((updater: Partial<TabState> | ((prev: TabState) => Partial<TabState>)) => {
    setTabStates((prev) => {
      const current = prev[activeTab];
      const updates = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        [activeTab]: { ...current, ...updates },
      };
    });
  }, [activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentTabState.messages, isLoading, activeTab]);

  const sendMessage = useCallback(
    async (text: string, startGenerating = false, displayMessageOverride?: string) => {
      const current = tabStates[activeTab];

      if (!startGenerating) {
        updateCurrentTab((prev) => ({
          messages: [
            ...prev.messages,
            { role: "user", content: displayMessageOverride || text, parsed: null },
          ]
        }));
      }
      setIsLoading(true);

      const apiHistory = displayMessageOverride ? [] : [
        ...current.chatHistory,
        { role: "user", content: text, timestamp: new Date().toISOString() }
      ];

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatMessage: text,
            chatHistory: apiHistory,
            startGenerating: startGenerating ? "true" : "false",
          }),
        });

        const data = await res.json();
        console.log("[vibe] Raw API response:", JSON.stringify(data).slice(0, 1000));

        let rawResult = data?.data?.executeWorkflow?.result;
        console.log("[vibe] rawResult type:", typeof rawResult, "keys:", typeof rawResult === "object" && rawResult ? Object.keys(rawResult) : "n/a");

        if (typeof rawResult === "string") {
          try { rawResult = JSON.parse(rawResult); } catch { /* leave */ }
        }

        let innerResult = rawResult?.response ?? rawResult;
        console.log("[vibe] innerResult type:", typeof innerResult, "keys:", typeof innerResult === "object" && innerResult ? Object.keys(innerResult) : "n/a");

        if (typeof innerResult === "string") {
          try { innerResult = JSON.parse(innerResult); } catch { /* leave */ }
        }

        let parsed: AssistantResponse | null = null;
        let assistantContent = "";

        if (innerResult && typeof innerResult === "object" && innerResult.message) {
          parsed = innerResult as AssistantResponse;
          console.log("[vibe] Parsed — stage:", parsed.stage, "confidence:", parsed.confidence, "plans:", parsed.plans?.length ?? (parsed.plan ? 1 : 0), "questions:", parsed.questions?.length, "flow_jsons:", parsed.flow_jsons?.length ?? (parsed.flow_json ? 1 : 0));
        } else if (typeof innerResult === "string") {
          assistantContent = innerResult;
        } else {
          assistantContent = JSON.stringify(rawResult);
        }

        updateCurrentTab(prev => {
          return {
            messages: [
              ...prev.messages,
              {
                role: "assistant",
                content: assistantContent || "No response received.",
                parsed,
              },
            ],
            confidence: parsed && typeof parsed.confidence === "number" ? parsed.confidence : prev.confidence,
            latestMermaid: parsed && parsed.mermaid ? parsed.mermaid : prev.latestMermaid,
            showDiagram: parsed && parsed.mermaid ? true : prev.showDiagram,
            chatHistory: [
              ...prev.chatHistory,
              { role: "user", content: text, timestamp: new Date().toISOString() },
              {
                role: "assistant",
                content: parsed ? JSON.stringify(parsed) : assistantContent,
                timestamp: new Date().toISOString(),
              },
            ]
          };
        });
      } catch (error) {
        console.error("[vibe] Send message error:", error);
        updateCurrentTab(prev => ({
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: "Something went wrong. Please try again.",
              parsed: {
                stage: "error",
                message: "Something went wrong. Please try again.",
                confidence: 0,
              },
            },
          ]
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, tabStates, updateCurrentTab]
  );

  const sendMigrationRequest = async () => {
    const validation = validateN8nInput(n8nJsonRaw);
    if (!validation.valid) {
      setN8nError(validation.error!);
      return;
    }
    setN8nError(null);

    const enrichedMessage = buildMigrationMessage(n8nJsonRaw);
    updateCurrentTab({ jsonInputPhase: false });
    await sendMessage(enrichedMessage, false, "📥 Analysing n8n workflow...");
  };

  const handleAnswer = useCallback(
    (formattedAnswer: string) => {
      updateCurrentTab({ pendingAnswers: null });
      sendMessage(formattedAnswer, false);
    },
    [sendMessage, updateCurrentTab]
  );

  const handleAnswersChange = useCallback((formatted: string | null) => {
    updateCurrentTab({ pendingAnswers: formatted });
  }, [updateCurrentTab]);

  const handleChatSend = useCallback(
    (text: string) => {
      const current = tabStates[activeTab];
      if (current.pendingAnswers) {
        const combined = text.trim()
          ? `${current.pendingAnswers}\n\nAdditional context: ${text.trim()}`
          : current.pendingAnswers;
        updateCurrentTab({ pendingAnswers: null });
        sendMessage(combined, false);
      } else {
        sendMessage(text, false);
      }
    },
    [activeTab, tabStates, sendMessage, updateCurrentTab]
  );

  const handleStartBuilding = () => {
    const current = tabStates[activeTab];
    const lastUserMsg =
      current.chatHistory.filter((m) => m.role === "user").pop()?.content || "";
    sendMessage(lastUserMsg || "Build it", true);
  };

  const handleNewChat = () => {
    updateCurrentTab({
      messages: [],
      chatHistory: [],
      latestMermaid: null,
      showDiagram: false,
      confidence: 0,
      pendingAnswers: null,
      jsonInputPhase: true,
    });
    if (activeTab === "n8n") {
      setN8nJsonRaw("");
      setN8nError(null);
    }
  };

  const hasMessages = currentTabState.messages.length > 0;
  const isBuilding = currentTabState.messages.some((m) => m.parsed?.stage === "building");
  const canBuild = currentTabState.confidence >= 0.8 && !isBuilding;

  const lastAssistantIdx = currentTabState.messages.reduce(
    (last, msg, i) => (msg.role === "assistant" ? i : last),
    -1
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            {/* Desktop text indicator, hidden or shrunk if necessary */}
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("vibe")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "vibe"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              Vibe Assistant
            </button>
            <button
              onClick={() => setActiveTab("n8n")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "n8n"
                ? "bg-[#FF6D5A]/10 text-[#FF6D5A] shadow-sm border border-[#FF6D5A]/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              n8n Migrator
            </button>
          </div>
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
          {currentTabState.latestMermaid && !currentTabState.showDiagram && (
            <button
              onClick={() => updateCurrentTab({ showDiagram: true })}
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
              activeTab === "n8n" && currentTabState.jsonInputPhase ? (
                <div className="flex h-full flex-col items-center justify-center px-4 py-8">
                  <div className="w-full max-w-2xl space-y-6">
                    <div className="text-center space-y-2">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6D5A]/10 border border-[#FF6D5A]/20 mb-4">
                        <FileJson className="h-7 w-7 text-[#FF6D5A]" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">n8n Migrator</h2>
                      <p className="text-sm text-muted-foreground">Paste your n8n workflow JSON export below</p>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={n8nJsonRaw}
                        onChange={(e) => {
                          setN8nJsonRaw(e.target.value);
                          if (n8nError) setN8nError(null);
                        }}
                        placeholder={`Paste your n8n JSON export here...\n\nTip: In n8n, go to the workflow menu → Download → this gives you the JSON.`}
                        className="w-full h-[320px] p-4 font-mono text-xs rounded-xl border border-border bg-secondary/30 focus:border-[#FF6D5A]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6D5A]/50 resize-none text-foreground placeholder:text-muted-foreground/60"
                      />
                      {n8nError && (
                        <p className="text-red-500 text-sm font-medium px-1">{n8nError}</p>
                      )}
                      <button
                        onClick={sendMigrationRequest}
                        disabled={!n8nJsonRaw.trim() || isLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6D5A] hover:bg-[#FF6D5A]/90 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6D5A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="flex gap-1 items-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
                          </span>
                        ) : (
                          <>
                            Analyse & Migrate
                            <Send className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
              )
            ) : (
              <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
                {currentTabState.messages.map((msg, i) => (
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
          {!(activeTab === "n8n" && currentTabState.jsonInputPhase) && (
            <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 pt-3 pb-4">
              <div className="mx-auto max-w-2xl space-y-3">
                {hasMessages && !isBuilding && currentTabState.confidence > 0 && currentTabState.confidence < 0.8 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all duration-500"
                        style={{ width: `${Math.round(currentTabState.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {Math.round(currentTabState.confidence * 100)}% ready to build
                    </span>
                  </div>
                )}

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
                    currentTabState.pendingAnswers
                      ? "Add extra context (optional) and press Enter to send with your answers..."
                      : "Describe the AI workflow you want to build..."
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Mermaid side panel */}
        {currentTabState.showDiagram && currentTabState.latestMermaid && (
          <div className="hidden lg:flex w-[380px] flex-col border-l border-border bg-card/50">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Flow Diagram
              </h3>
              <button
                onClick={() => updateCurrentTab({ showDiagram: false })}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
                aria-label="Close diagram panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <MermaidDiagram chart={currentTabState.latestMermaid} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
