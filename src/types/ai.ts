export type ProviderType = "openrouter" | "huggingface";
export type ModelCapability = "TEXT" | "VISION" | "REASONING" | "TOOLS" | "STRUCTURED_OUTPUT" | "LONG_CONTEXT" | "CODE" | "EMBEDDING" | "AUDIO" | "IMAGE";

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  pricing: { input: number; output: number };
  contextLength: number;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: ModelCapability[];
  free: boolean;
  available: boolean;
  lastChecked: string;
}

export interface ChatRequest {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  mode?: string;
  stream?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderHealth {
  provider: ProviderType;
  available: boolean;
  latencyMs?: number;
  lastChecked: string;
  message?: string;
}
