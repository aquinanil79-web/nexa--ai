import { listHuggingFaceModels } from "@/lib/providers/huggingface";
import { listOpenRouterModels } from "@/lib/providers/openrouter";
import type { ModelInfo } from "@/types/ai";

const emergencyFreeModels: ModelInfo[] = [
  { id: "liquid/lfm-2.5-2.6b:free", name: "Liquid LFM 2.5 2.6B", provider: "openrouter", pricing: { input: 0, output: 0 }, contextLength: 32768, inputModalities: ["text"], outputModalities: ["text"], capabilities: ["TEXT"], free: true, available: true, lastChecked: new Date().toISOString() },
  { id: "inclusionai/ling-3.0-flash-fin:free", name: "Ling 3.0 Flash", provider: "openrouter", pricing: { input: 0, output: 0 }, contextLength: 32768, inputModalities: ["text"], outputModalities: ["text"], capabilities: ["TEXT", "REASONING"], free: true, available: true, lastChecked: new Date().toISOString() },
];

export async function getFreeModels(): Promise<ModelInfo[]> {
  const results = await Promise.allSettled([listOpenRouterModels(), listHuggingFaceModels()]);
  const models = results.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((model) => model.free && model.available);
  return models.length > 0 ? models : emergencyFreeModels;
}

export async function chooseFreeModel(requested?: string): Promise<ModelInfo> {
  const models = await getFreeModels();
  const selected = requested && requested !== "auto" ? models.find((model) => model.id === requested) ?? models[0] : models[0];
  if (!selected) throw new Error("No currently available free model is configured");
  return selected;
}
