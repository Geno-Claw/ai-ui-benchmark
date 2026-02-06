"use client";

import { useState, useRef, useCallback } from "react";
import { Run, GenerationResult } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";
import { saveRun } from "@/lib/db";

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

interface ProgressEvent {
  runId: string;
  model: string;
  variant: number;
  status: "generating" | "complete" | "error";
  total: number;
  completed: number;
  cost?: number;
  durationMs?: number;
  tokens?: { input: number; output: number };
  error?: string;
  result?: GenerationResult;
}

interface InitEvent {
  runId: string;
  prompt: string;
  promptTitle: string;
  models: string[];
  mode: string;
  date: string;
  totalVariants: number;
}

interface UseBackgroundGenerationOptions {
  onComplete?: (runId: string) => void;
}

export function useBackgroundGeneration(options?: UseBackgroundGenerationOptions) {
  const [progress, setProgress] = useState<ProgressState>({
    status: "idle",
    message: "",
    current: 0,
    total: 0,
  });
  const [partialRun, setPartialRun] = useState<Run | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const totalCostRef = useRef(0);
  const completedTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const partialRunRef = useRef<Run | null>(null);

  const getEstimatedTimeRemaining = useCallback((): number | null => {
    if (completedTimesRef.current.length < 2 || progress.current === 0) return null;
    const elapsed = Date.now() - startTimeRef.current;
    const avgPerVariant = elapsed / progress.current;
    const remaining = (progress.total - progress.current) * avgPerVariant;
    return remaining;
  }, [progress]);

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    // Keep partial data but reset active state
    setProgress((prev) => ({
      ...prev,
      status: "idle",
      message: "Cancelled",
    }));
    setActiveRunId(null);
    abortControllerRef.current = null;
  }, []);

  const startGeneration = useCallback(async (params: GenerateParams) => {
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

    // Initialize model statuses
    const initialStatuses: Record<string, ModelStatus> = {};
    for (const modelId of params.models) {
      initialStatuses[modelId] = { completed: 0, total: variantsPerModel };
    }

    setProgress({
      status: "generating",
      message: "Starting benchmark…",
      current: 0,
      total: totalVariants,
      cost: 0,
      modelStatuses: initialStatuses,
    });

    try {
      const body: Record<string, unknown> = {
        models: params.models,
        mode: params.mode,
      };

      if (params.modelEfforts && Object.keys(params.modelEfforts).length > 0) {
        body.modelEfforts = params.modelEfforts;
      }

      if (params.promptId) {
        body.promptId = params.promptId;
      } else if (params.prompt) {
        body.prompt = params.prompt;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          const eventMatch = block.match(/^event: (.+)/m);
          const dataMatch = block.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "init") {
            const initData = data as InitEvent;

            // Create empty Run shell
            const emptyDesigns: Record<string, GenerationResult[]> = {};
            for (const modelId of initData.models) {
              emptyDesigns[modelId] = [];
            }

            const runShell: Run = {
              id: initData.runId,
              prompt: initData.prompt,
              promptTitle: initData.promptTitle,
              models: initData.models,
              mode: initData.mode as "raw" | "skill",
              date: initData.date,
              totalVariants: initData.totalVariants,
              designs: emptyDesigns,
            };

            partialRunRef.current = runShell;
            setPartialRun(runShell);
            setActiveRunId(initData.runId);

            // Save initial shell to IndexedDB
            await saveRun(runShell);
          } else if (event === "progress") {
            const pe = data as ProgressEvent;

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
            }

            setProgress((prev) => {
              const modelStatuses = { ...(prev.modelStatuses || {}) };
              const ms = modelStatuses[pe.model] || {
                completed: 0,
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
                DEFAULT_MODELS.find((m) => m.id === pe.model)?.name || pe.model;
              const message =
                pe.status === "generating"
                  ? `${modelName} — variant ${pe.variant}/5`
                  : pe.status === "complete"
                    ? `${modelName} — variant ${pe.variant}/5 ✓`
                    : `${modelName} — variant ${pe.variant}/5 ✗`;

              return {
                status: "generating",
                message,
                current: pe.completed,
                total: pe.total,
                cost: totalCostRef.current,
                modelStatuses,
              };
            });
          } else if (event === "complete") {
            // Replace partialRun with final Run
            const run = data as Run;
            await saveRun(run);

            partialRunRef.current = run;
            setPartialRun(run);

            setProgress((prev) => ({
              ...prev,
              status: "complete",
              message: "Benchmark complete!",
              current: totalVariants,
              total: totalVariants,
            }));

            // Notify parent after brief delay
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
              options?.onComplete?.(run.id);
            }, 1500);
          } else if (event === "error") {
            setProgress((prev) => ({
              ...prev,
              status: "error",
              message: data.error || "Unknown error",
            }));
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Keep partial data, just reset active state
        setProgress((prev) => ({
          ...prev,
          status: "idle",
          message: "Cancelled",
        }));
        setActiveRunId(null);
      } else {
        setProgress((prev) => ({
          ...prev,
          status: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        }));
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [options]);

  return {
    progress,
    partialRun,
    activeRunId,
    startGeneration,
    cancelGeneration,
    getEstimatedTimeRemaining,
  };
}
