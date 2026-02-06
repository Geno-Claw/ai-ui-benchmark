import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODELS } from "@/lib/config";
import { runBenchmark } from "@/runner/generate";
import { saveRun } from "@/runner/archiver";
import { loadPrompt, inlinePrompt } from "@/runner/prompt-loader";

/** POST /api/generate — Trigger a benchmark run, streamed via SSE */
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
    reasoningEffort,
  } = body as {
    prompt?: string;
    promptId?: string;
    models: string[];
    mode: "raw" | "skill";
    reasoningEffort?: string;
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

  // 5. Create an AbortController that listens for client disconnect
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  // 6. Stream SSE
  console.log(`[generate] Starting benchmark (SSE): "${promptTitle}" | mode=${mode} | models=${models.map(m => m.id).join(", ")}`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream may have been closed by client disconnect
        }
      };

      try {
        const validEfforts = ["none", "minimal", "low", "medium", "high", "xhigh"];
        const effort = reasoningEffort && validEfforts.includes(reasoningEffort)
          ? (reasoningEffort as "none" | "minimal" | "low" | "medium" | "high" | "xhigh")
          : undefined;

        const { run } = await runBenchmark({
          prompt: promptText,
          promptTitle,
          models,
          mode,
          apiKey,
          reasoningEffort: effort,
          signal: abortController.signal,
          onProgress: (update) => {
            send("progress", update);
          },
        });

        // Save to archive
        console.log(`[generate] Benchmark complete, saving run ${run.id}...`);
        await saveRun(run);

        // Send summary (without full HTML content)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { designs: _designs, ...summary } = run;
        send("complete", summary);
        console.log(`[generate] Run saved: ${run.id}`);
      } catch (err) {
        if (abortController.signal.aborted) {
          send("error", { error: "Generation cancelled" });
          console.log("[generate] Benchmark cancelled by client");
        } else {
          const message =
            err instanceof Error ? err.message : "Unknown error during generation";
          send("error", { error: message });
          console.error(`[generate] Benchmark failed:`, message);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
