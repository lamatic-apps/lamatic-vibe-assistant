export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AssistantResponse {
  stage: "planning" | "guardrail" | "building" | "error";
  message: string;
  mermaid: string;
  flow_yaml: string;
  questions: string[];
  plan?: string;
  confidence?: number;
}

export interface ParsedAssistantContent {
  raw: string;
  parsed: AssistantResponse | null;
}
