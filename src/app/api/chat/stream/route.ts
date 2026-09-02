import { NextRequest } from "next/server";
import { streamHuggingFace } from "@/lib/providers/huggingface";
import { streamOpenRouter } from "@/lib/providers/openrouter";
import { chooseFreeModel, getFreeModels } from "@/lib/router/model-router";
import type { ChatMessage } from "@/types/ai";

function errorMessage(status: number): string {
  if (status === 401 || status === 403) return "The provider credentials are not accepted. Check your server environment.";
  if (status === 429) return "This model is rate limited. Try again shortly or select another free model.";
  if (status >= 500) return "The model provider is temporarily unavailable.";
  return "The model could not process this request.";
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { messages?: ChatMessage[]; model?: string };
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.some((message) => typeof message.content !== "string" || !["user", "assistant", "system"].includes(message.role))) return Response.json({ error: "A valid message list is required." }, { status: 400 });
  if (JSON.stringify(body).length > 100_000) return Response.json({ error: "Request is too large." }, { status: 413 });

  const first = await chooseFreeModel(body.model);
  const candidates = [first, ...(await getFreeModels()).filter((model) => model.id !== first.id)];
  let response: Response | undefined;
  let selected = first;
  for (const candidate of candidates.slice(0, 3)) {
    selected = candidate;
    try {
      response = candidate.provider === "openrouter" ? await streamOpenRouter(candidate.id, body.messages) : await streamHuggingFace(candidate.id, body.messages);
      if (response.ok) break;
    } catch {
      response = undefined;
    }
  }
  if (!response?.ok) return Response.json({ error: errorMessage(response?.status ?? 503) }, { status: response?.status ?? 503 });
  if (!response.body) return Response.json({ error: "The provider returned an empty stream." }, { status: 502 });

  const encoder = new TextEncoder();
  const reader = response.body.getReader();
  const stream = new ReadableStream({ async pull(controller) { try { const { done, value } = await reader.read(); if (done) { controller.close(); return; } controller.enqueue(value); } catch { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "The response stream ended unexpectedly." })}\n\n`)); controller.close(); } }, cancel() { reader.cancel(); } });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Nexa-Model": selected.id, "X-Nexa-Provider": selected.provider } });
}