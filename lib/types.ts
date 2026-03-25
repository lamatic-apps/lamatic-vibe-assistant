export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface Question {
  id: string;
  text: string;
  type: "select" | "multi_select" | "text";
  options?: QuestionOption[];
}

export interface PlanNode {
  type: string;
  purpose: string;
  config_notes?: string;
}

export interface PlanObject {
  name?: string;
  trigger_type: string;
  nodes: PlanNode[];
  response_type: string;
  integrations: string[];
  description: string;
}

export interface FlowJsonItem {
  name: string;
  flow_json: string;
}

export interface AssistantResponse {
  stage: "planning" | "building" | "guardrail" | "error";
  message: string;
  confidence: number;
  // Optional — LLM decides whether to include these
  mermaid?: string;
  plans?: PlanObject[];
  questions?: Question[];
  flow_jsons?: FlowJsonItem[];
  // Legacy single-flow fields (backward compat)
  plan?: PlanObject;
  flow_json?: string;
}
