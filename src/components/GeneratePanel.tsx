"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PromptConfig, ReasoningEffort } from "@/lib/types";
import { DEFAULT_MODELS, getModelGroups } from "@/lib/config";

const EFFORT_LABELS: Record<ReasoningEffort, { label: string; description: string }> = {
  none: { label: "Off", description: "No reasoning" },
  minimal: { label: "Minimal", description: "Bare minimum" },
  low: { label: "Low", description: "Quick, cheap" },
  medium: { label: "Medium", description: "Balanced" },
  high: { label: "High", description: "Thorough" },
  xhigh: { label: "XHigh", description: "OpenAI max" },
  max: { label: "Max", description: "Anthropic max" },
};
import { formatCost } from "@/lib/utils";

interface GeneratePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (runId: string) => void;
}

interface ModelStatus {
  completed: number;
  total: number;
  error?: boolean;
  lastError?: string;
}

interface GenerationProgress {
  status: "idle" | "generating" | "complete" | "error";
  message: string;
  current: number;
  total: number;
  cost?: number;
  modelStatuses?: Record<string, ModelStatus>;
}

interface ProgressEvent {
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

/** Modal panel for starting a new benchmark run. */
export default function GeneratePanel({
  isOpen,
  onClose,
  onComplete,
}: GeneratePanelProps) {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("custom");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(DEFAULT_MODELS.map((m) => m.id))
  );
  const [mode, setMode] = useState<"raw" | "skill">("raw");
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("none");
  const [progress, setProgress] = useState<GenerationProgress>({
    status: "idle",
    message: "",
    current: 0,
    total: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const totalCostRef = useRef(0);
  const completedTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const modelGroups = getModelGroups();

  // Check if any selected model supports reasoning and compute available efforts
  const selectedReasoningModels = DEFAULT_MODELS.filter(
    (m) => selectedModels.has(m.id) && m.reasoningEfforts && m.reasoningEfforts.length > 0
  );
  const anySelectedSupportsReasoning = selectedReasoningModels.length > 0;

  // Compute the union of all effort levels across selected models
  const availableEfforts: ReasoningEffort[] = useMemo(
    () =>
      anySelectedSupportsReasoning
        ? Array.from(
            new Set(selectedReasoningModels.flatMap((m) => m.reasoningEfforts ?? []))
          ).sort((a, b) => {
            const order: ReasoningEffort[] = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
            return order.indexOf(a) - order.indexOf(b);
          })
        : ["none"],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anySelectedSupportsReasoning, selectedModels]
  );

  // Load prompts from API
  useEffect(() => {
    if (isOpen) {
      fetch("/api/prompts")
        .then((res) => res.json())
        .then((data: PromptConfig[]) => setPrompts(data))
        .catch(() => setPrompts([]));
    }
  }, [isOpen]);

  // Reset reasoning effort when selection changes
  useEffect(() => {
    if (!anySelectedSupportsReasoning) {
      setReasoningEffort("none");
    } else if (!availableEfforts.includes(reasoningEffort)) {
      // Current effort not supported by any selected model — clamp to nearest valid
      setReasoningEffort("none");
    }
  }, [anySelectedSupportsReasoning, availableEfforts, reasoningEffort]);

  // Extract categories dynamically from loaded prompts
  const categories = Array.from(new Set(prompts.map((p) => p.category)));
  const categoryCounts: Record<string, number> = { All: prompts.length };
  for (const cat of categories) {
    categoryCounts[cat] = prompts.filter((p) => p.category === cat).length;
  }
  const filteredPrompts =
    selectedCategory === "All"
      ? prompts
      : prompts.filter((p) => p.category === selectedCategory);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        if (next.size > 1) next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedModels(new Set(DEFAULT_MODELS.map((m) => m.id)));
  };

  const deselectAll = () => {
    // Keep at least the first model selected
    setSelectedModels(new Set([DEFAULT_MODELS[0].id]));
  };

  const canGenerate = useCallback(() => {
    const hasApiKey = !!localStorage.getItem("openrouter-api-key");
    const hasPrompt =
      selectedPromptId !== "custom" || customPrompt.trim().length > 0;
    const hasModels = selectedModels.size > 0;
    return hasApiKey && hasPrompt && hasModels && progress.status !== "generating";
  }, [selectedPromptId, customPrompt, selectedModels, progress.status]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (completedTimesRef.current.length < 2 || progress.current === 0) return null;
    const elapsed = Date.now() - startTimeRef.current;
    const avgPerVariant = elapsed / progress.current;
    const remaining = (progress.total - progress.current) * avgPerVariant;
    if (remaining < 1000) return "< 1s";
    if (remaining < 60000) return `~${Math.ceil(remaining / 1000)}s`;
    return `~${Math.ceil(remaining / 60000)}m`;
  }, [progress]);

  const handleGenerate = async () => {
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

    const totalVariants = selectedModels.size * 5;
    const variantsPerModel = 5;

    // Initialize model statuses
    const initialStatuses: Record<string, ModelStatus> = {};
    for (const modelId of selectedModels) {
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
        models: Array.from(selectedModels),
        mode,
      };

      if (reasoningEffort !== "none" && anySelectedSupportsReasoning) {
        body.reasoningEffort = reasoningEffort;
      }

      if (selectedPromptId === "custom") {
        body.prompt = customPrompt.trim();
      } else {
        body.promptId = selectedPromptId;
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
        // Non-SSE error response (validation errors)
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

          if (event === "progress") {
            const pe = data as ProgressEvent;

            // Accumulate cost
            if (pe.cost && pe.status === "complete") {
              totalCostRef.current += pe.cost;
            }

            // Track completion times for ETA
            if (pe.status === "complete" || pe.status === "error") {
              completedTimesRef.current.push(Date.now());
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
            setProgress((prev) => ({
              ...prev,
              status: "complete",
              message: "Benchmark complete!",
              current: totalVariants,
              total: totalVariants,
            }));

            // Notify parent after brief delay
            setTimeout(() => {
              onComplete(data.id);
              setProgress({
                status: "idle",
                message: "",
                current: 0,
                total: 0,
              });
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
        setProgress({
          status: "idle",
          message: "Cancelled",
          current: 0,
          total: 0,
        });
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
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  if (!isOpen) return null;

  const hasApiKey =
    typeof window !== "undefined" &&
    !!localStorage.getItem("openrouter-api-key");
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;
  const eta = getEstimatedTimeRemaining();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={progress.status !== "generating" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] max-w-3xl mx-auto z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            New Benchmark Run
          </h2>
          <button
            onClick={onClose}
            disabled={progress.status === "generating"}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* API Key Warning */}
          {!hasApiKey && (
            <div className="flex items-center gap-3 bg-amber-500/10 text-amber-400 px-4 py-3 rounded-lg text-sm">
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              No API key configured. Open Settings to add your OpenRouter key.
            </div>
          )}

          {/* Prompt Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Prompt
            </label>

            {/* Category filter pills */}
            {prompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (
                        cat !== "All" &&
                        selectedPromptId !== "custom" &&
                        !prompts.find(
                          (p) =>
                            p.id === selectedPromptId && p.category === cat
                        )
                      ) {
                        setSelectedPromptId("custom");
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/40"
                        : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    {cat}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedCategory === cat
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-gray-700 text-gray-500"
                      }`}
                    >
                      {categoryCounts[cat] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="custom">Custom prompt…</option>
              {filteredPrompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.category}
                </option>
              ))}
            </select>

            {selectedPromptId === "custom" ? (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Build a modern landing page for a SaaS product..."
                rows={4}
                className="w-full bg-gray-800 text-gray-200 rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
              />
            ) : selectedPrompt ? (
              <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-400">
                <p className="text-gray-500 text-xs mb-1">
                  {selectedPrompt.description}
                </p>
                <p className="line-clamp-3">{selectedPrompt.prompt}</p>
              </div>
            ) : null}
          </div>

          {/* Model Selection — grouped by provider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Models{" "}
                <span className="text-gray-500 font-normal">
                  ({selectedModels.size} selected)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Deselect all
                </button>
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Select all
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {modelGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 px-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all border ${
                          selectedModels.has(model.id)
                            ? "bg-blue-600/10 border-blue-500/50 text-blue-300"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            selectedModels.has(model.id)
                              ? "bg-blue-600 border-blue-500"
                              : "border-gray-600"
                          }`}
                        >
                          {selectedModels.has(model.id) && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{model.name}</span>
                        {model.reasoningEfforts && model.reasoningEfforts.length > 0 && (
                          <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0" title="Supports reasoning">
                            🧠
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("raw")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  mode === "raw"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="font-medium">Raw</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Send prompt directly to models
                </div>
              </button>
              <button
                onClick={() => setMode("skill")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  mode === "skill"
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="font-medium">Skill-Augmented</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Prepend frontend-design skill
                </div>
              </button>
            </div>
          </div>

          {/* Reasoning Effort — only visible when relevant */}
          {anySelectedSupportsReasoning && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Reasoning Effort
              </label>
              <div className="flex gap-1.5">
                {availableEfforts.map((effort) => {
                  const info = EFFORT_LABELS[effort];
                  return (
                    <button
                      key={effort}
                      onClick={() => setReasoningEffort(effort)}
                      className={`flex-1 px-2 py-2.5 rounded-lg text-center transition-all border ${
                        reasoningEffort === effort
                          ? effort === "none"
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-amber-500/15 border-amber-500/50 text-amber-300"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      <div className="text-xs font-medium">{info.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{info.description}</div>
                    </button>
                  );
                })}
              </div>
              {reasoningEffort !== "none" && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  {selectedReasoningModels.map((m) => {
                    const supported = m.reasoningEfforts?.includes(reasoningEffort);
                    return (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <span className={supported ? "text-green-400" : "text-gray-600"}>
                          {supported ? "✓" : "–"}
                        </span>
                        <span className={supported ? "text-gray-400" : "text-gray-600"}>
                          {m.name}
                          {!supported && " (not supported, will skip reasoning)"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-400">
            Will generate{" "}
            <span className="text-white font-medium">
              {selectedModels.size * 5}
            </span>{" "}
            designs ({selectedModels.size} model
            {selectedModels.size !== 1 ? "s" : ""} × 5 variants)
            {reasoningEffort !== "none" && (
              <span className="text-amber-400"> · reasoning: {reasoningEffort}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 space-y-3">
          {/* Progress */}
          {progress.status !== "idle" && (
            <div className="space-y-3">
              {/* Status message */}
              <div
                className={`text-sm flex items-center gap-2 ${
                  progress.status === "generating"
                    ? "text-blue-400"
                    : progress.status === "complete"
                      ? "text-green-400"
                      : "text-red-400"
                }`}
              >
                {progress.status === "generating" && (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {progress.status === "complete" && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {progress.status === "error" && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                )}
                <span className="flex-1">{progress.message}</span>
                {progress.status === "generating" && (
                  <span className="text-xs text-gray-500">
                    {progress.current}/{progress.total}
                    {eta && ` · ${eta} remaining`}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {progress.status === "generating" && progress.total > 0 && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, percentage)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{percentage}%</span>
                    {(progress.cost ?? 0) > 0 && (
                      <span>Cost: {formatCost(progress.cost)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Per-model status */}
              {progress.status === "generating" && progress.modelStatuses && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(progress.modelStatuses).map(
                    ([modelId, ms]) => {
                      const modelName =
                        DEFAULT_MODELS.find((m) => m.id === modelId)?.name ||
                        modelId;
                      const done = ms.completed >= ms.total;
                      return (
                        <div
                          key={modelId}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                            ms.error
                              ? "bg-red-500/10 text-red-400"
                              : done
                                ? "bg-green-500/10 text-green-400"
                                : ms.completed > 0
                                  ? "bg-blue-500/10 text-blue-300"
                                  : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {done ? (
                            ms.error ? (
                              <span>⚠</span>
                            ) : (
                              <span>✓</span>
                            )
                          ) : ms.completed > 0 ? (
                            <svg
                              className="w-3 h-3 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-gray-600" />
                          )}
                          <span className="truncate">{modelName}</span>
                          <span className="ml-auto font-mono">
                            {ms.completed}/{ms.total}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {/* Cost summary on complete */}
              {progress.status === "complete" && (progress.cost ?? 0) > 0 && (
                <div className="text-xs text-gray-500">
                  Total cost: {formatCost(progress.cost)}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {progress.status === "generating" ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-3 rounded-lg text-sm font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-blue-600/50 text-white/60 cursor-not-allowed"
                >
                  Generating…
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate()}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate {selectedModels.size * 5} Designs
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
