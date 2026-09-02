import { NextResponse } from "next/server";
import { listHuggingFaceModels } from "@/lib/providers/huggingface";
import { listOpenRouterModels } from "@/lib/providers/openrouter";
import type { ModelInfo } from "@/types/ai";

export async function GET() {
  const results = await Promise.allSettled([listOpenRouterModels(), listHuggingFaceModels()]);
  const models = results.flatMap((result) => result.status === "fulfilled" ? result.value : []) as ModelInfo[];
  return NextResponse.json({ models, checkedAt: new Date().toISOString(), freeOnly: true });
}
