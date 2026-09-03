import { listHuggingFaceModels } from "@/lib/providers/huggingface";
import { listOpenRouterModels } from "@/lib/providers/openrouter";
import type { ModelInfo } from "@/types/ai";

const knownOpenRouterFreeModels = [
  "openrouter/free",
  "inclusionai/ling-3.0-flash-fin:free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
];

function fallbackModels(): ModelInfo[] {
  return knownOpenRouterFreeModels.map((id) => ({
    id, name: id.split("/").at(-1) ?? id, provider: "openrouter" as const,
    pricing: { input: 0, output: 0 }, contextLength: 32768,
    inputModalities: ["text"], outputModalities: ["text"], capabilities: ["TEXT" as const],
    free: true, available: true, lastChecked: new Date().toISOString(),
  }));
}

export async function getFreeModels(): Promise<ModelInfo[]> {
  const results = await Promise.allSettled([listOpenRouterModels(), listHuggingFaceModels()]);
  const models = results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((model) => model.free && model.available);
  if (models.length === 0) return fallbackModels();
  const router = fallbackModels()[0];
  return [router, ...models.filter((model) => model.id !== router.id)];
}

export async function chooseFreeModel(requested?: string): Promise<ModelInfo> {
  const models = await getFreeModels();
  const selected = requested && requested !== "auto"
    ? models.find((model) => model.id === requested) ?? models[0]
    : models[0];
  return selected ?? fallbackModels()[0]!;
}
