import { NextResponse } from "next/server";
import { listPrompts } from "@/runner/prompt-loader";

/** GET /api/prompts — List all available prompts from the prompt bank */
export async function GET() {
  const prompts = await listPrompts();
  return NextResponse.json(prompts);
}
