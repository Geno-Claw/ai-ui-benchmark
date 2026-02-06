import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODELS } from "@/lib/config";
import { runBenchmark } from "@/runner/generate";
import { saveRun } from "@/runner/archiver";
import { loadPrompt, inlinePrompt } from "@/runner/prompt-loader";

/** POST /api/generate — Trigger a benchmark run */
export async function POST(request: NextRequest) {
  // 1. Extract API key
  const apiKey = request.headers.get("x-openrouter-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Set x-openrouter-key header." },
      { status: 401 }
    );
  }

  // 2. Parse body
  const body = await request.json();
  const {
    prompt: inlineText,
    promptId,
    models: modelIds,
    mode,
  } = body as {
    prompt?: string;
    promptId?: string;
    models: string[];
    mode: "raw" | "skill";
  };

  // Validate required fields
  if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'models' array." },
      { status: 400 }
    );
  }

  if (!mode || !["raw", "skill"].includes(mode)) {
    return NextResponse.json(
      { error: "Missing or invalid 'mode'. Must be 'raw' or 'skill'." },
      { status: 400 }
    );
  }

  // 3. Resolve prompt
  let promptText: string;
  let promptTitle: string;

  if (promptId) {
    const loaded = await loadPrompt(promptId);
    if (!loaded) {
      return NextResponse.json(
        { error: `Prompt '${promptId}' not found.` },
        { status: 400 }
      );
    }
    promptText = loaded.prompt;
    promptTitle = loaded.title;
  } else if (inlineText) {
    const inline = inlinePrompt(inlineText);
    promptText = inline.prompt;
    promptTitle = inline.title;
  } else {
    return NextResponse.json(
      { error: "Provide either 'prompt' (text) or 'promptId'." },
      { status: 400 }
    );
  }

  // 4. Look up ModelConfig for each model ID
  const models = modelIds
    .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
    .filter((m) => m !== undefined);

  if (models.length === 0) {
    return NextResponse.json(
      {
        error: `No valid models found. Available: ${DEFAULT_MODELS.map((m) => m.id).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // 5. Run benchmark
  try {
    const { run } = await runBenchmark({
      prompt: promptText,
      promptTitle,
      models,
      mode,
      apiKey,
    });

    // 6. Save to archive
    await saveRun(run);

    // 7. Return run summary (without full HTML content)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { designs: _designs, ...summary } = run;
    return NextResponse.json(summary);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
