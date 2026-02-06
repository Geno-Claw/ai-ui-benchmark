import { NextResponse } from "next/server";
import { loadIndex } from "@/runner/archiver";

/** GET /api/runs — List all archived runs */
export async function GET() {
  const runs = await loadIndex();
  return NextResponse.json(runs);
}
