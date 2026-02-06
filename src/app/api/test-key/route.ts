import { NextRequest, NextResponse } from "next/server";

/** POST /api/test-key — Validate an OpenRouter API key */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-openrouter-key");
  if (!apiKey) {
    return NextResponse.json(
      { valid: false, error: "Missing API key" },
      { status: 401 }
    );
  }

  try {
    // Make a minimal request to OpenRouter to validate the key
    // Using the models endpoint which is lightweight
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI UI Benchmark",
      },
    });

    if (response.ok) {
      return NextResponse.json({ valid: true });
    }

    // If the models endpoint requires auth and fails, key is invalid
    const errorData = await response.text();
    return NextResponse.json({
      valid: false,
      error: `API returned ${response.status}: ${errorData}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to validate key";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
