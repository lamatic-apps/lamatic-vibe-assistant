"use client";

import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              primaryColor: "#2dd4bf",
              primaryTextColor: "#f0fdf4",
              primaryBorderColor: "#2dd4bf",
              lineColor: "#4b5563",
              secondaryColor: "#1e293b",
              tertiaryColor: "#0f172a",
              fontFamily: "Geist, sans-serif",
              fontSize: "13px",
            },
            flowchart: {
              htmlLabels: true,
              curve: "basis",
            },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Date.now()}`;

        // Sanitize chart to fix common LLM mistakes like unquoted special characters
        const sanitizeMermaid = (rawNodeStr: string) => {
          if (!rawNodeStr) return rawNodeStr;
          return rawNodeStr.split('\n').map(line => {
            let pLine = line;
            // Fix square bracket nodes: id[text] -> id["text"]
            pLine = pLine.replace(/([A-Za-z0-9_-]+)\[([^"\]]+)\]/g, (match, idStr, text) => {
              if (text.startsWith('[') || text.endsWith(']')) return match;
              if (text.startsWith('(') && text.endsWith(')')) return match;
              return `${idStr}["${text}"]`;
            });
            // Fix curly bracket nodes: id{text} -> id{"text"}
            pLine = pLine.replace(/([A-Za-z0-9_-]+)\{([^"\}]+)\}/g, (match, idStr, text) => {
              if (text.startsWith('{') || text.endsWith('}')) return match;
              return `${idStr}{"${text}"}`;
            });
            // Fix round bracket nodes: id(text) -> id("text")
            pLine = pLine.replace(/([A-Za-z0-9_-]+)\(([^"\)]+)\)/g, (match, idStr, text) => {
              if (text.startsWith('(') || text.endsWith(')')) return match;
              if (text.startsWith('[') && text.endsWith(']')) return match;
              return `${idStr}("${text}")`;
            });
            return pLine;
          }).join('\n');
        };

        const sanitizedChart = sanitizeMermaid(chart);
        const { svg } = await mermaid.render(id, sanitizedChart);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("[v0] Mermaid render error:", err);
        setError("Could not render diagram");
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-secondary/50 p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center overflow-auto [&_svg]:max-w-full"
    />
  );
}
