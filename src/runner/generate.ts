import { readFileSync } from "fs";
import path from "path";
import { GenerateOptions, GenerationResult, ModelConfig, Run } from "@/lib/types";
import { VARIANT_TEMPERATURES } from "@/lib/config";
import { callOpenRouter } from "./openrouter";
import { loadIndex } from "./archiver";

export interface BenchmarkOptions {
  prompt: string;
  promptTitle?: string;
  models: ModelConfig[];
  mode: "raw" | "skill";
  apiKey: string;
  variantsPerModel?: number;
  onProgress?: (update: ProgressUpdate) => void;
  signal?: AbortSignal;
  reasoning?: boolean;
}

export interface ProgressUpdate {
  model: string;
  variant: number;
  status: "generating" | "complete" | "error";
  total: number;
  completed: number;
  cost?: number;
  durationMs?: number;
  tokens?: { input: number; output: number };
  error?: string;
}

export interface BenchmarkResult {
  run: Run;
}

/**
 * Slugify a string for use in run IDs.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Generate a unique run ID, incrementing if a duplicate exists.
 */
async function generateRunId(
  promptTitle: string,
  mode: string
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(promptTitle);
  const base = `${date}-${slug}-${mode}`;

  const index = await loadIndex();
  const existingIds = new Set(index.map((r) => r.id));

  if (!existingIds.has(base)) {
    return base;
  }

  // Increment suffix
  let n = 2;
  while (existingIds.has(`${base}-${n}`)) {
    n++;
  }
  return `${base}-${n}`;
}

/**
 * Load the frontend-design skill text for skill mode.
 */
function loadSkillText(): string {
  const skillPath = path.join(
    process.cwd(),
    "docs",
    "skills",
    "frontend-design-skill.md"
  );
  return readFileSync(skillPath, "utf-8");
}

/**
 * Build the full prompt for a given variant.
 */
function buildPrompt(
  basePrompt: string,
  mode: "raw" | "skill",
  variant: number,
  totalVariants: number
): string {
  let prompt = "";

  if (mode === "skill") {
    const skillText = loadSkillText();
    prompt = skillText + "\n\n" + basePrompt;
  } else {
    prompt = basePrompt;
  }

  prompt += `\n\nThis is design variant ${variant} of ${totalVariants}. Make this design distinct from the others — choose a different aesthetic direction, color palette, typography, and layout approach.\n\nIMPORTANT: Return ONLY the complete HTML file. No markdown, no code fences, no explanation. Start with <!DOCTYPE html> and end with </html>.`;

  return prompt;
}

/**
 * Run a full benchmark: generate variants for each model.
 * Models run in parallel; variants within a model run sequentially
 * to avoid rate limits.
 */
export async function runBenchmark(
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const {
    prompt,
    promptTitle = "Custom Prompt",
    models,
    mode,
    apiKey,
    variantsPerModel = 5,
    onProgress,
    signal,
    reasoning,
  } = options;

  const runId = await generateRunId(promptTitle, mode);
  const total = models.length * variantsPerModel;
  let completed = 0;

  console.log(`[runner] Run ${runId}: ${total} total variants (${models.length} models × ${variantsPerModel} variants)`);

  // Generate for all models in parallel, variants sequential within each
  const modelResults = await Promise.all(
    models.map(async (model) => {
      const variants: GenerationResult[] = [];
      console.log(`[runner] ${model.id}: starting ${variantsPerModel} variants...`);

      for (let v = 0; v < variantsPerModel; v++) {
        // Check for abort before each variant
        if (signal?.aborted) {
          console.log(`[runner] ${model.id}: aborted before variant ${v + 1}`);
          break;
        }

        const variantNum = v + 1;
        const temperature = VARIANT_TEMPERATURES[v] ?? 1.0;

        console.log(`[runner] ${model.id} variant ${variantNum}/${variantsPerModel} (temp=${temperature}) — generating...`);

        // Report generating
        onProgress?.({
          model: model.id,
          variant: variantNum,
          status: "generating",
          total,
          completed,
        });

        const fullPrompt = buildPrompt(prompt, mode, variantNum, variantsPerModel);

        const genOptions: GenerateOptions = {
          model,
          variant: variantNum,
          mode,
          temperature,
          apiKey,
          reasoning,
        };

        const result = await callOpenRouter(fullPrompt, genOptions, signal);
        variants.push(result);
        completed++;

        if (result.error) {
          console.error(`[runner] ${model.id} variant ${variantNum}: ERROR — ${result.error}`);
        } else {
          console.log(`[runner] ${model.id} variant ${variantNum}: done (${result.durationMs}ms, ${result.tokens.output} tokens)`);
        }

        // Report completion with cost/duration/tokens
        onProgress?.({
          model: model.id,
          variant: variantNum,
          status: result.error ? "error" : "complete",
          total,
          completed,
          cost: result.cost,
          durationMs: result.durationMs,
          tokens: result.tokens,
          error: result.error,
        });
      }

      console.log(`[runner] ${model.id}: all variants complete`);
      return { modelId: model.id, variants };
    })
  );

  const designs: Record<string, GenerationResult[]> = {};
  for (const { modelId, variants } of modelResults) {
    designs[modelId] = variants;
  }

  const run: Run = {
    id: runId,
    prompt,
    promptTitle,
    models: models.map((m) => m.id),
    mode,
    date: new Date().toISOString(),
    totalVariants: total,
    designs,
  };

  return { run };
}
