import { promises as fs } from "fs";
import path from "path";
import { Run, RunSummary, GenerationResult } from "@/lib/types";

const ARCHIVE_DIR = path.join(process.cwd(), "archive");
const INDEX_PATH = path.join(ARCHIVE_DIR, "index.json");

/**
 * Save a benchmark run to the archive.
 */
export async function saveRun(run: Run): Promise<void> {
  const runDir = path.join(ARCHIVE_DIR, run.id);
  await fs.mkdir(runDir, { recursive: true });

  // Save designs as individual HTML files
  for (const [modelId, variants] of Object.entries(run.designs)) {
    const modelDir = path.join(runDir, modelId);
    await fs.mkdir(modelDir, { recursive: true });

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      await fs.writeFile(
        path.join(modelDir, `variant-${i + 1}.html`),
        variant.html,
        "utf-8"
      );
    }
  }

  // Save run metadata (without full HTML content to keep meta.json small)
  const meta = {
    id: run.id,
    prompt: run.prompt,
    promptTitle: run.promptTitle,
    models: run.models,
    mode: run.mode,
    date: run.date,
    totalVariants: run.totalVariants,
    designs: Object.fromEntries(
      Object.entries(run.designs).map(([modelId, variants]) => [
        modelId,
        variants.map(({ html: _html, ...rest }: GenerationResult) => rest),
      ])
    ),
  };
  await fs.writeFile(
    path.join(runDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8"
  );

  // Update index
  await updateIndex(run);
}

/**
 * Update the archive index with a new run summary.
 */
async function updateIndex(run: Run): Promise<void> {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });

  let index: RunSummary[] = [];
  try {
    const content = await fs.readFile(INDEX_PATH, "utf-8");
    index = JSON.parse(content);
  } catch {
    // Index doesn't exist yet
  }

  const summary: RunSummary = {
    id: run.id,
    prompt: run.prompt,
    promptTitle: run.promptTitle,
    models: run.models,
    mode: run.mode,
    date: run.date,
    totalVariants: run.totalVariants,
  };

  // Replace if exists, otherwise prepend
  const existingIdx = index.findIndex((r) => r.id === run.id);
  if (existingIdx >= 0) {
    index[existingIdx] = summary;
  } else {
    index.unshift(summary);
  }

  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Load the archive index.
 */
export async function loadIndex(): Promise<RunSummary[]> {
  try {
    const content = await fs.readFile(INDEX_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Load a full run from the archive, including HTML variant content.
 */
export async function loadRun(runId: string): Promise<Run | null> {
  const runDir = path.join(ARCHIVE_DIR, runId);
  const metaPath = path.join(runDir, "meta.json");

  try {
    const metaContent = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaContent);

    // Reconstruct designs with full HTML content
    const designs: Record<string, GenerationResult[]> = {};

    for (const modelId of meta.models as string[]) {
      const modelDir = path.join(runDir, modelId);
      const metaDesigns = meta.designs?.[modelId] ?? [];
      const variants: GenerationResult[] = [];

      for (let i = 0; i < metaDesigns.length; i++) {
        const htmlPath = path.join(modelDir, `variant-${i + 1}.html`);
        let html = "";
        try {
          html = await fs.readFile(htmlPath, "utf-8");
        } catch {
          // HTML file might not exist if generation errored
        }

        variants.push({
          html,
          tokens: metaDesigns[i].tokens ?? { input: 0, output: 0 },
          durationMs: metaDesigns[i].durationMs ?? 0,
          model: metaDesigns[i].model ?? modelId,
          cost: metaDesigns[i].cost,
          error: metaDesigns[i].error,
        });
      }

      designs[modelId] = variants;
    }

    return {
      id: meta.id,
      prompt: meta.prompt,
      promptTitle: meta.promptTitle,
      models: meta.models,
      mode: meta.mode,
      date: meta.date,
      totalVariants: meta.totalVariants,
      designs,
    };
  } catch {
    return null;
  }
}

/**
 * Delete an archived run.
 */
export async function deleteRun(runId: string): Promise<void> {
  const runDir = path.join(ARCHIVE_DIR, runId);
  await fs.rm(runDir, { recursive: true, force: true });

  // Update index
  const index = await loadIndex();
  const filtered = index.filter((r) => r.id !== runId);
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(filtered, null, 2), "utf-8");
}
