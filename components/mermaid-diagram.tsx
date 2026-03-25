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

        // Sanitize chart to fix common LLM mistakes
        const sanitizeMermaid = (raw: string) => {
          if (!raw) return raw;

          let s = raw;

          // Strip emoji characters — they break mermaid's parser
          s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '');

          // Replace literal \n inside node labels with <br/> for line breaks
          s = s.replace(/(\[[^\]]*\]|\([^)]*\)|\{[^}]*\})/g, (match) => {
            return match.replace(/\\n/g, '<br/>');
          });

          // Process line by line for node quoting
          s = s.split('\n').map(line => {
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

          // Strip special chars from subgraph labels (em dashes, colons, etc.)
          s = s.replace(/subgraph\s+(.+)/g, (_match, label) => {
            return 'subgraph ' + label.replace(/[—–]/g, '-').replace(/[^\w\s\-\[\]"()]/g, '');
          });

          // Force top-down direction for better fit in side panel
          s = s.replace(/^graph\s+LR/m, 'graph TD');

          return s;
        };

        const sanitizedChart = sanitizeMermaid(chart);
        const { svg } = await mermaid.render(id, sanitizedChart);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Remove the inline max-width mermaid injects so the SVG can render at natural size
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.removeProperty("max-width");
            // Use the viewBox to determine natural width; fall back to 100% for simple diagrams
            const vb = svgEl.getAttribute("viewBox");
            const naturalWidth = vb ? parseFloat(vb.split(" ")[2]) : null;
            if (naturalWidth && naturalWidth > 340) {
              // Diagram is wider than the panel — let it render at natural size and scroll
              svgEl.removeAttribute("width");
              svgEl.style.width = `${naturalWidth}px`;
              svgEl.style.minWidth = `${naturalWidth}px`;
            } else {
              // Diagram fits — stretch to fill
              svgEl.removeAttribute("width");
              svgEl.style.width = "100%";
              svgEl.style.minWidth = "0";
            }
            svgEl.style.height = "auto";
          }
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
      className="overflow-auto w-full"
    />
  );
}
