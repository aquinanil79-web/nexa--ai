import type { ModelInfo } from "@/types/ai";

export function isCurrentlyFree(pricing: { prompt?: string | number; completion?: string | number; input?: number; output?: number }): boolean {
  const input = Number(pricing.input ?? pricing.prompt ?? NaN);
  const output = Number(pricing.output ?? pricing.completion ?? NaN);
  return Number.isFinite(input) && Number.isFinite(output) && input === 0 && output === 0;
}

export function onlyFreeModels(models: ModelInfo[]): ModelInfo[] {
  return models.filter((model) => model.free && model.available && model.pricing.input === 0 && model.pricing.output === 0);
}
