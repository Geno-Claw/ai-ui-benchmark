/**
 * @deprecated Runs are now stored client-side in IndexedDB.
 * This route is retained for backward compatibility but is no longer
 * called by the main application flow.
 */
import { NextResponse } from "next/server";
import { loadIndex } from "@/runner/archiver";

/** GET /api/runs — List all archived runs (DEPRECATED: use IndexedDB) */
export async function GET() {
  const runs = await loadIndex();
  return NextResponse.json(runs);
}
