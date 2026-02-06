import { GenerateOptions, GenerationResult } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 2;

/**
 * Send a generation request to OpenRouter.
 * Uses the OpenAI-compatible chat completions API with plain fetch().
 */
export async function callOpenRouter(
  prompt: string,
  options: GenerateOptions,
  signal?: AbortSignal
): Promise<GenerationResult> {
  const start = Date.now();
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[openrouter] ${options.model.id}: retry ${attempt}/${MAX_RETRIES}...`);
    }
    try {
      // Build request body
      const body: Record<string, unknown> = {
        model: options.model.openRouterId,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature ?? 0.9,
      };

      // Add reasoning parameter if model supports it and effort is set
      if (options.reasoningEffort && options.reasoningEffort !== "none" && options.model.supportsReasoning) {
        body.reasoning = { effort: options.reasoningEffort };
      }

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI UI Benchmark",
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[openrouter] ${options.model.id}: HTTP ${response.status} — ${errorBody.slice(0, 200)}`);
        throw new Error(
          `OpenRouter API error ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json();

      // Extract the generated content
      const content = data.choices?.[0]?.message?.content ?? "";

      // Extract token usage
      const usage = data.usage ?? {};
      const tokens = {
        input: usage.prompt_tokens ?? 0,
        output: usage.completion_tokens ?? 0,
      };

      // OpenRouter returns cost in usage.cost (USD credits)
      const cost = usage.cost ?? undefined;

      return {
        html: content,
        tokens,
        durationMs: Date.now() - start,
        model: options.model.openRouterId,
        cost,
      };
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "Unknown error during generation";

      // Don't retry on the last attempt
      if (attempt < MAX_RETRIES) {
        // Brief backoff before retry
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  // All retries exhausted
  return {
    html: "",
    tokens: { input: 0, output: 0 },
    durationMs: Date.now() - start,
    model: options.model.openRouterId,
    error: lastError ?? "Generation failed after retries",
  };
}
