import { GenerateOptions, GenerationResult } from "@/lib/types";

/**
 * Send a generation request to OpenRouter.
 * Uses the OpenAI-compatible chat completions API.
 */
export async function callOpenRouter(
  prompt: string,
  options: GenerateOptions
): Promise<GenerationResult> {
  const start = Date.now();

  // TODO: Implement OpenRouter API call
  // POST https://openrouter.ai/api/v1/chat/completions
  // Headers: Authorization: Bearer <apiKey>, HTTP-Referer, X-Title
  // Body: { model, messages, temperature }

  const _prompt = prompt;
  const _options = options;
  void _prompt;
  void _options;

  return {
    html: "<!-- TODO: Implement OpenRouter integration -->",
    tokens: { input: 0, output: 0 },
    durationMs: Date.now() - start,
    model: options.model.openRouterId,
  };
}
