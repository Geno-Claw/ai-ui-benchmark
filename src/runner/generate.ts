import { GenerateOptions, GenerationResult, ModelConfig } from "@/lib/types";
import { VARIANT_TEMPERATURES } from "@/lib/config";
import { callOpenRouter } from "./openrouter";

export interface BenchmarkOptions {
  prompt: string;
  models: ModelConfig[];
  mode: "raw" | "skill";
  apiKey: string;
  variantsPerModel?: number;
}

export interface BenchmarkResult {
  runId: string;
  designs: Record<string, GenerationResult[]>;
}

/**
 * Run a full benchmark: generate variants for each model.
 * Models run in parallel; variants within a model run sequentially
 * to avoid rate limits.
 */
export async function runBenchmark(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { prompt, models, mode, apiKey, variantsPerModel = 5 } = options;

  // TODO: Generate run ID (YYYY-MM-DD-<prompt-slug>-<mode>)
  const runId = `${new Date().toISOString().slice(0, 10)}-placeholder-${mode}`;

  // TODO: If skill mode, prepend frontend-design skill to prompt
  const finalPrompt = prompt;

  // Generate for all models in parallel
  const modelResults = await Promise.all(
    models.map(async (model) => {
      const variants: GenerationResult[] = [];
      for (let v = 0; v < variantsPerModel; v++) {
        const genOptions: GenerateOptions = {
          model,
          variant: v + 1,
          mode,
          temperature: VARIANT_TEMPERATURES[v] ?? 1.0,
          apiKey,
        };
        const result = await callOpenRouter(finalPrompt, genOptions);
        variants.push(result);
      }
      return { modelId: model.id, variants };
    })
  );

  const designs: Record<string, GenerationResult[]> = {};
  for (const { modelId, variants } of modelResults) {
    designs[modelId] = variants;
  }

  return { runId, designs };
}
