/**
 * @deprecated Runs are now stored client-side in IndexedDB.
 * These routes are retained for backward compatibility but are no longer
 * called by the main application flow.
 */
import { NextRequest, NextResponse } from "next/server";
import { loadRun, deleteRun } from "@/runner/archiver";

/** GET /api/runs/[runId] — Get full run data */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await loadRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

/** DELETE /api/runs/[runId] — Delete an archived run */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    await deleteRun(runId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
