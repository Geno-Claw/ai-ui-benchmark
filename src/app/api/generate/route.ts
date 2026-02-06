import { NextRequest, NextResponse } from "next/server";

/** POST /api/generate — Trigger a benchmark run */
export async function POST(request: NextRequest) {
  // TODO: Implement generation endpoint
  // 1. Extract API key from x-openrouter-key header
  // 2. Parse body: { prompt, models, mode }
  // 3. Run benchmark via runner/generate.ts
  // 4. Archive results via runner/archiver.ts
  // 5. Return run summary

  const _body = await request.json();
  void _body;

  return NextResponse.json(
    { error: "Not implemented yet" },
    { status: 501 }
  );
}
