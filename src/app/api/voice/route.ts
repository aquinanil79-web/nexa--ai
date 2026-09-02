import { NextRequest, NextResponse } from "next/server";
import { streamOpenRouter } from "@/lib/providers/openrouter";
import { getFreeModels } from "@/lib/router/model-router";
import type { ChatMessage } from "@/types/ai";

export async function POST(request: NextRequest) {
  const body = await request.json() as { text?: string; model?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "Text is required." }, { status: 400 });
  const audioModels = (await getFreeModels()).filter((model) => model.provider === "openrouter" && model.capabilities.includes("AUDIO"));
  const model = audioModels.find((candidate) => candidate.id === body.model) ?? audioModels.find((candidate) => candidate.id.toLowerCase().includes("fish")) ?? audioModels[0];
  if (!model) return NextResponse.json({ error: "No currently available free OpenRouter audio model can create voice output." }, { status: 503 });
  const messages: ChatMessage[] = [{ role: "user", content: body.text.trim() }];
  const response = await streamOpenRouter(model.id, messages);
  if (!response.ok) return NextResponse.json({ error: "The free audio model is temporarily unavailable." }, { status: response.status });
  return new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-store", "X-Nexa-Model": model.id } });
}