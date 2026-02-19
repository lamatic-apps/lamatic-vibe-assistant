"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight, Zap } from "lucide-react";
import type { PlanObject } from "@/lib/types";

const TRIGGER_LABELS: Record<string, string> = {
  chatTriggerNode: "Chat Widget",
  graphqlNode: "API Endpoint",
  webhookTriggerNode: "Webhook",
  searchTriggerNode: "Search Widget",
  n8nTriggerNode: "n8n Trigger",
};

const RESPONSE_LABELS: Record<string, string> = {
  chatResponseNode: "Chat Response",
  graphqlResponseNode: "API Response",
  searchResponseNode: "Search Response",
  n8nResponseNode: "n8n Response",
};

interface PlanCardProps {
  plan: PlanObject;
  // mermaid is accepted but displayed in the right panel, not inline
  mermaid?: string;
}

export function PlanCard({ plan, mermaid }: PlanCardProps) {
  const [expanded, setExpanded] = useState(true);

  const triggerLabel = TRIGGER_LABELS[plan.trigger_type] || plan.trigger_type;
  const responseLabel = RESPONSE_LABELS[plan.response_type] || plan.response_type;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            {plan.description || "Flow Plan"}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          {/* Pipeline visual */}
          <div className="pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Flow Architecture
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <PipelineNode label={triggerLabel} type="trigger" />
              {plan.nodes.map((node, i) => (
                <div key={i} className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <PipelineNode label={node.purpose || node.type} type="node" />
                </div>
              ))}
              <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <PipelineNode label={responseLabel} type="response" />
            </div>
          </div>

          {/* Integrations */}
          {plan.integrations && plan.integrations.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                Integrations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plan.integrations.map((int) => (
                  <span
                    key={int}
                    className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {int}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Node details */}
          {plan.nodes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Node Details
              </p>
              {plan.nodes.map((node, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-mono text-primary/70">{node.type}</span>
                    <span className="text-xs text-foreground/80">{node.purpose}</span>
                  </div>
                  {node.config_notes && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{node.config_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Diagram lives in the right side panel — nothing inline here */}
        </div>
      )}
    </div>
  );
}

function PipelineNode({
  label,
  type,
}: {
  label: string;
  type: "trigger" | "node" | "response";
}) {
  const colors = {
    trigger: "border-green-500/30 bg-green-500/10 text-green-400",
    node: "border-border bg-secondary/60 text-foreground/80",
    response: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  };

  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium max-w-[140px] truncate ${colors[type]}`}
      title={label}
    >
      {label}
    </span>
  );
}
