import { NextResponse } from "next/server";
import { getFreeModels } from "@/lib/router/model-router";

export async function GET() {
  const models = await getFreeModels();
  return NextResponse.json({ models, checkedAt: new Date().toISOString(), freeOnly: true });
}
