"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Run, GenerationResult, ActiveJob, ModelConfig } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";
import { getPromptById } from "@/lib/prompts";
import { runBenchmark, ProgressUpdate } from "@/runner/generate";
import {
  saveRun,
  loadRun as dbLoadRun,
  saveActiveJob,
  loadActiveJob,
  clearActiveJob,
  updateJobProgress,
} from "@/lib/db";

export interface ProgressState {
  status: "idle" | "generating" | "complete" | "error";
  message: string;
  current: number;
  total: number;
  cost?: number;
  modelStatuses?: Record<string, ModelStatus>;
}

export interface ModelStatus {
  completed: number;
  total: number;
  error?: boolean;
  lastError?: string;
}

export interface GenerateParams {
  prompt?: string;
  promptId?: string;
  models: string[];
  mode: "raw" | "skill";
  modelEfforts?: Record<string, string>;
}

export interface ResumableJob {
  job: ActiveJob;
  completedCount: number;
  totalCount: number;
}

interface UseBackgroundGenerationOptions {
  onComplete?: (runId: string) => void;
}

export function useBackgroundGeneration(
  options?: UseBackgroundGenerationOptions
) {
  const [progress, setProgress] = useState<ProgressState>({
    status: "idle",
    message: "",
    current: 0,
    total: 0,
  });
  const [partialRun, setPartialRun] = useState<Run | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [resumableJob, setResumableJob] = useState<ResumableJob | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const totalCostRef = useRef(0);
  const completedTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const partialRunRef = useRef<Run | null>(null);
  const initCheckedRef = useRef(false);

  // ── beforeunload warning ───────────────────────────────────────────
  const isGeneratingRef = useRef(false);
  useEffect(() => {
    isGeneratingRef.current = progress.status === "generating";
  }, [progress.status]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isGeneratingRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom returnValue text but still show the dialog
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Resume detection on mount ──────────────────────────────────────
  useEffect(() => {
    if (initCheckedRef.current) return;
    initCheckedRef.current = true;

    (async () => {
      try {
        const job = await loadActiveJob();
        if (!job) return;

        // Mark as interrupted (it was active when the page died)
        if (job.status === "active") {
          job.status = "interrupted";
          await saveActiveJob(job);
        }

        // Load the partial run from IndexedDB
        const run = await dbLoadRun(job.id);
        if (!run) {
          // No partial run found — discard stale job
          await clearActiveJob();
          return;
        }

        // Count actual completed variants from the run data
        const completedVariants: Record<string, number> = {};
        let totalCompleted = 0;
        for (const modelId of job.params.models) {
          const count = (run.designs[modelId] || []).length;
          completedVariants[modelId] = count;
          totalCompleted += count;
        }

        // Update the job record with accurate counts
        job.completedVariants = completedVariants;
        await saveActiveJob(job);

        // If all variants are done, just clear the job — nothing to resume
        if (totalCompleted >= job.totalVariants) {
          await clearActiveJob();
          return;
        }

        // Expose as resumable
        setResumableJob({
          job,
          completedCount: totalCompleted,
          totalCount: job.totalVariants,
        });

        // Set the partial run so the UI can show it
        setPartialRun(run);
        partialRunRef.current = run;
        setActiveRunId(job.id);
      } catch {
        // If anything fails, just silently continue
      }
    })();
  }, []);

  const getEstimatedTimeRemaining = useCallback((): number | null => {
    if (completedTimesRef.current.length < 2 || progress.current === 0)
      return null;
    const elapsed = Date.now() - startTimeRef.current;
    const avgPerVariant = elapsed / progress.current;
    const remaining = (progress.total - progress.current) * avgPerVariant;
    return remaining;
  }, [progress]);

  const cancelGeneration = useCallback(async () => {
    abortControllerRef.current?.abort();
    // Keep partial data but reset active state
    setProgress((prev) => ({
      ...prev,
      status: "idle",
      message: "Cancelled",
    }));
    setActiveRunId(null);
    abortControllerRef.current = null;
    // Clear active job from IndexedDB
    await clearActiveJob();
  }, []);

  const discardResumableJob = useCallback(async () => {
    await clearActiveJob();
    setResumableJob(null);
    setActiveRunId(null);
    setPartialRun(null);
    partialRunRef.current = null;
  }, []);

  /** Start generation (or resume from where we left off) */
  const startGeneration = useCallback(
    async (
      params: GenerateParams,
      resumeOptions?: {
        resumeRunId: string;
        skipVariants: Record<string, number>;
      }
    ) => {
      const apiKey = localStorage.getItem("openrouter-api-key");
      if (!apiKey) {
        setProgress({
          status: "error",
          message: "No API key set. Configure it in Settings first.",
          current: 0,
          total: 0,
        });
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      totalCostRef.current = 0;
      completedTimesRef.current = [];
      startTimeRef.current = Date.now();

      const variantsPerModel = 5;
      const totalVariants = params.models.length * variantsPerModel;

      // Calculate how many we're skipping for resume
      const skipTotal = resumeOptions
        ? Object.values(resumeOptions.skipVariants).reduce((a, b) => a + b, 0)
        : 0;

      // Initialize model statuses
      const initialStatuses: Record<string, ModelStatus> = {};
      for (const modelId of params.models) {
        const skipped = resumeOptions?.skipVariants[modelId] ?? 0;
        initialStatuses[modelId] = {
          completed: skipped,
          total: variantsPerModel,
        };
      }

      setProgress({
        status: "generating",
        message: resumeOptions
          ? "Resuming benchmark…"
          : "Starting benchmark…",
        current: skipTotal,
        total: totalVariants,
        cost: 0,
        modelStatuses: initialStatuses,
      });

      // Clear resumable job state since we're now actively generating
      setResumableJob(null);

      // Persist active job to IndexedDB (only for fresh starts — resume reuses existing)
      if (!resumeOptions) {
        const activeJob: ActiveJob = {
          id: "", // Will be set when we get the init event
          params: {
            prompt: params.prompt,
            promptId: params.promptId,
            models: params.models,
            mode: params.mode,
            modelEfforts: params.modelEfforts,
          },
          startedAt: new Date().toISOString(),
          completedVariants: Object.fromEntries(
            params.models.map((m) => [m, 0])
          ),
          totalVariants,
          status: "active",
        };
        // We'll update the ID once we get the init event
        // For now save with a placeholder
        await saveActiveJob(activeJob);
      }

      // Resolve prompt locally (was done server-side in API route)
      let promptText: string;
      let promptTitle: string;

      if (params.promptId) {
        const loaded = getPromptById(params.promptId);
        if (!loaded) {
          setProgress({ status: "error", message: `Prompt '${params.promptId}' not found.`, current: 0, total: 0 });
          return;
        }
        promptText = loaded.prompt;
        promptTitle = loaded.title;
      } else if (params.prompt) {
        promptText = params.prompt;
        promptTitle = "Custom Prompt";
      } else {
        setProgress({ status: "error", message: "No prompt provided.", current: 0, total: 0 });
        return;
      }

      // Resolve model configs locally
      const models = params.models
        .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
        .filter((m): m is ModelConfig => m !== undefined);

      if (models.length === 0) {
        setProgress({ status: "error", message: "No valid models selected.", current: 0, total: 0 });
        return;
      }

      try {
        const { run } = await runBenchmark({
          prompt: promptText,
          promptTitle,
          models,
          mode: params.mode,
          apiKey,
          modelEfforts: params.modelEfforts,
          resumeRunId: resumeOptions?.resumeRunId,
          skipVariants: resumeOptions?.skipVariants,
          signal: controller.signal,

          onInit: async (metadata) => {
            if (resumeOptions) {
              // For resume, load existing partial run and continue appending
              const existingRun = await dbLoadRun(resumeOptions.resumeRunId);
              if (existingRun) {
                partialRunRef.current = existingRun;
                setPartialRun(existingRun);
                setActiveRunId(existingRun.id);

                // Update active job with correct ID
                const job = await loadActiveJob();
                if (job) {
                  job.id = existingRun.id;
                  job.status = "active";
                  await saveActiveJob(job);
                }
              }
            } else {
              // Create empty Run shell for fresh start
              const emptyDesigns: Record<string, GenerationResult[]> = {};
              for (const modelId of metadata.models) {
                emptyDesigns[modelId] = [];
              }

              const runShell: Run = {
                id: metadata.runId,
                prompt: metadata.prompt,
                promptTitle: metadata.promptTitle,
                models: metadata.models,
                mode: metadata.mode as "raw" | "skill",
                date: metadata.date,
                totalVariants: metadata.totalVariants,
                designs: emptyDesigns,
              };

              partialRunRef.current = runShell;
              setPartialRun(runShell);
              setActiveRunId(metadata.runId);

              // Save initial shell to IndexedDB
              await saveRun(runShell);

              // Update active job with the real runId
              const job = await loadActiveJob();
              if (job) {
                job.id = metadata.runId;
                await saveActiveJob(job);
              }
            }
          },

          onProgress: async (pe: ProgressUpdate) => {
            // Accumulate cost
            if (pe.cost && (pe.status === "complete" || pe.status === "error")) {
              totalCostRef.current += pe.cost;
            }

            // Track completion times for ETA
            if (pe.status === "complete" || pe.status === "error") {
              completedTimesRef.current.push(Date.now());
            }

            // Append result to partial run if available
            if (pe.result && partialRunRef.current) {
              const current = partialRunRef.current;
              const modelResults = [...(current.designs[pe.model] || [])];
              modelResults.push(pe.result);
              const updatedRun: Run = {
                ...current,
                designs: {
                  ...current.designs,
                  [pe.model]: modelResults,
                },
              };
              partialRunRef.current = updatedRun;
              setPartialRun(updatedRun);

              // Save incrementally to IndexedDB
              await saveRun(updatedRun);

              // Update active job progress
              await updateJobProgress(pe.model, modelResults.length);
            }

            // For resume, pe.completed reflects only the remaining work done
            // We need to add the skip offset to get the true total
            const adjustedCompleted = resumeOptions
              ? skipTotal + pe.completed
              : pe.completed;

            setProgress((prev) => {
              const modelStatuses = { ...(prev.modelStatuses || {}) };
              const ms = modelStatuses[pe.model] || {
                completed: resumeOptions?.skipVariants[pe.model] ?? 0,
                total: variantsPerModel,
              };

              if (pe.status === "complete") {
                modelStatuses[pe.model] = {
                  ...ms,
                  completed: ms.completed + 1,
                };
              } else if (pe.status === "error") {
                modelStatuses[pe.model] = {
                  ...ms,
                  completed: ms.completed + 1,
                  error: true,
                  lastError: pe.error,
                };
              }

              const modelName =
                DEFAULT_MODELS.find((m) => m.id === pe.model)?.name ||
                pe.model;
              const message =
                pe.status === "generating"
                  ? `${modelName} — variant ${pe.variant}/5`
                  : pe.status === "complete"
                    ? `${modelName} — variant ${pe.variant}/5 ✓`
                    : `${modelName} — variant ${pe.variant}/5 ✗`;

              return {
                status: "generating",
                message,
                current: adjustedCompleted,
                total: totalVariants,
                cost: totalCostRef.current,
                modelStatuses,
              };
            });
          },
        });

        // Generation complete — save final run
        const finalRun = partialRunRef.current ?? run;
        await saveRun(finalRun);

        partialRunRef.current = finalRun;
        setPartialRun(finalRun);

        // Clear active job — generation is done
        await clearActiveJob();

        setProgress((prev) => ({
          ...prev,
          status: "complete",
          message: "Benchmark complete!",
          current: totalVariants,
          total: totalVariants,
        }));

        // Notify parent after brief delay
        const completedRunId = finalRun.id;
        setTimeout(() => {
          setActiveRunId(null);
          setPartialRun(null);
          partialRunRef.current = null;
          setProgress({
            status: "idle",
            message: "",
            current: 0,
            total: 0,
          });
          options?.onComplete?.(completedRunId);
        }, 1500);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Keep partial data, just reset active state
          setProgress((prev) => ({
            ...prev,
            status: "idle",
            message: "Cancelled",
          }));
          setActiveRunId(null);
          await clearActiveJob();
        } else {
          setProgress((prev) => ({
            ...prev,
            status: "error",
            message: err instanceof Error ? err.message : "Generation failed",
          }));
          // Don't clear active job on error — it can be resumed
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [options]
  );

  /** Resume an interrupted generation */
  const resumeGeneration = useCallback(async () => {
    if (!resumableJob) return;

    const { job } = resumableJob;
    const skipVariants: Record<string, number> = { ...job.completedVariants };

    await startGeneration(
      {
        prompt: job.params.prompt,
        promptId: job.params.promptId,
        models: job.params.models,
        mode: job.params.mode,
        modelEfforts: job.params.modelEfforts,
      },
      {
        resumeRunId: job.id,
        skipVariants,
      }
    );
  }, [resumableJob, startGeneration]);

  return {
    progress,
    partialRun,
    activeRunId,
    resumableJob,
    startGeneration,
    cancelGeneration,
    resumeGeneration,
    discardResumableJob,
    getEstimatedTimeRemaining,
  };
}
