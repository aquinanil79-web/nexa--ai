import "server-only";
import { isCurrentlyFree, onlyFreeModels } from "./free-policy";
import type { ChatMessage, ModelCapability, ModelInfo, ProviderHealth } from "@/types/ai";

const endpoint = "https://openrouter.ai/api/v1";

export async function streamOpenRouter(model: string, messages: ChatMessage[]): Promise<Response> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OpenRouter is not configured");
  return fetch(`${endpoint}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "http://localhost:3000", "X-Title": "NEXA AI" }, body: JSON.stringify({ model, messages, stream: true }) });
}

export async function listOpenRouterModels(): Promise<ModelInfo[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  const response = await fetch(`${endpoint}/models`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`OpenRouter catalog request failed: ${response.status}`);
  const payload = await response.json() as { data?: Array<{ id: string; name?: string; pricing?: { prompt?: string; completion?: string }; context_length?: number; architecture?: { input_modalities?: string[]; output_modalities?: string[] } }> };
  const lastChecked = new Date().toISOString();
  return onlyFreeModels((payload.data ?? []).filter((model) => isCurrentlyFree(model.pricing ?? {})).map((model) => {
    const searchable = `${model.id} ${model.name ?? ""}`.toLowerCase();
    const inputModalities = model.architecture?.input_modalities ?? ["text"];
    const outputModalities = model.architecture?.output_modalities ?? ["text"];
    const capabilities: ModelCapability[] = ["TEXT"];
    if (inputModalities.some((modality) => modality.includes("image"))) capabilities.push("VISION");
    if (outputModalities.some((modality) => modality.includes("audio")) || searchable.includes("audio") || searchable.includes("fish")) capabilities.push("AUDIO");
    if (searchable.includes("coder") || searchable.includes("code")) capabilities.push("CODE");
    if (searchable.includes("reason") || searchable.includes("thinking") || searchable.includes("r1")) capabilities.push("REASONING");
    if (searchable.includes("embed")) capabilities.push("EMBEDDING");
    if (searchable.includes("flux") || outputModalities.some((modality) => modality.includes("image"))) capabilities.push("IMAGE");
    return { id: model.id, name: model.name ?? model.id, provider: "openrouter", pricing: { input: 0, output: 0 }, contextLength: model.context_length ?? 0, inputModalities, outputModalities, capabilities, free: true, available: true, lastChecked };
  }));
}

export async function openRouterHealth(): Promise<ProviderHealth> {
  const lastChecked = new Date().toISOString();
  if (!process.env.OPENROUTER_API_KEY) return { provider: "openrouter", available: false, lastChecked, message: "API key is not configured" };
  try { await listOpenRouterModels(); return { provider: "openrouter", available: true, lastChecked }; } catch { return { provider: "openrouter", available: false, lastChecked, message: "Catalog unavailable" }; }
}
