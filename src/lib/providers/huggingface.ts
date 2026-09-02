import "server-only";
import type { ChatMessage, ModelInfo, ProviderHealth } from "@/types/ai";

const endpoint = "https://router.huggingface.co/v1";
const recommendedModels = [
  { id: "Qwen/Qwen2.5-7B-Instruct", capabilities: ["TEXT", "REASONING"] as const },
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct", capabilities: ["TEXT", "CODE"] as const },
  { id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B", capabilities: ["TEXT", "REASONING"] as const },
  { id: "google/gemma-2-2b-it", capabilities: ["TEXT"] as const },
];

export async function listHuggingFaceModels(): Promise<ModelInfo[]> {
  if (!process.env.HUGGINGFACE_API_KEY) return [];
  const lastChecked = new Date().toISOString();
  const checks = await Promise.allSettled(recommendedModels.map(async (candidate) => {
    const response = await fetch(`https://huggingface.co/api/models/${candidate.id}?expand[]=inferenceProviderMapping`, { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` }, next: { revalidate: 300 } });
    if (!response.ok) return null;
    const metadata = await response.json() as { inferenceProviderMapping?: Record<string, unknown> };
    if (!metadata.inferenceProviderMapping || Object.keys(metadata.inferenceProviderMapping).length === 0) return null;
    return { id: candidate.id, name: candidate.id, provider: "huggingface" as const, pricing: { input: 0, output: 0 }, contextLength: 32768, inputModalities: ["text"], outputModalities: ["text"], capabilities: [...candidate.capabilities], free: true, available: true, lastChecked };
  }));
  return checks.flatMap((check) => check.status === "fulfilled" && check.value ? [check.value] : []);
}

export async function streamHuggingFace(model: string, messages: ChatMessage[]): Promise<Response> {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("Hugging Face is not configured");
  return fetch(`${endpoint}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, stream: true }) });
}

export async function huggingFaceHealth(): Promise<ProviderHealth> {
  return { provider: "huggingface", available: Boolean(process.env.HUGGINGFACE_API_KEY), lastChecked: new Date().toISOString(), message: process.env.HUGGINGFACE_API_KEY ? "Free availability may be subject to provider quotas" : "API key is not configured" };
}
