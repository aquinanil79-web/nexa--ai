import { listHuggingFaceModels } from "@/lib/providers/huggingface";
import { listOpenRouterModels } from "@/lib/providers/openrouter";
import type { ModelInfo } from "@/types/ai";

export async function getFreeModels(): Promise<ModelInfo[]> {
  const results = await Promise.allSettled([listOpenRouterModels(), listHuggingFaceModels()]);
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((model) => model.free && model.available);
}

export async function chooseFreeModel(requested?: string): Promise<ModelInfo> {
  const models = await getFreeModels();
  const selected = requested && requested !== "auto" ? models.find((model) => model.id === requested) : models[0];
  if (!selected) throw new Error("No currently available free model is configured");
  return selected;
}