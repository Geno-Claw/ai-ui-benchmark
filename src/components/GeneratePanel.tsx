"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ReasoningEffort } from "@/lib/types";
import { DEFAULT_MODELS, getModelGroups, DEFAULT_VARIANT_COUNT, MIN_VARIANT_COUNT, MAX_VARIANT_COUNT } from "@/lib/config";
import { PROMPT_BANK } from "@/lib/prompts";
import { ProgressState, GenerateParams } from "@/hooks/useBackgroundGeneration";

const EFFORT_LABELS: Record<ReasoningEffort, { label: string; short: string }> = {
  none: { label: "Off", short: "off" },
  on: { label: "On", short: "on" },
  minimal: { label: "Min", short: "min" },
  low: { label: "Low", short: "low" },
  medium: { label: "Med", short: "med" },
  high: { label: "High", short: "high" },
  xhigh: { label: "XHigh", short: "xhi" },
};
import { formatCost } from "@/lib/utils";

interface GeneratePanelProps {
  open: boolean;
  onClose: () => void;
  onRunGenerated: (runId: string) => void;
  progress: ProgressState;
  onStartGeneration: (params: GenerateParams) => void;
  onCancelGeneration: () => void;
  getEstimatedTimeRemaining?: () => number | null;
}

/** Modal panel for starting a new benchmark run. */
export default function GeneratePanel({
  open,
  onClose,
  progress,
  onStartGeneration,
  onCancelGeneration,
  getEstimatedTimeRemaining,
}: GeneratePanelProps) {
  const prompts = PROMPT_BANK;
  const [selectedPromptId, setSelectedPromptId] = useState<string>("custom");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(DEFAULT_MODELS.map((m) => m.id))
  );
  const [mode, setMode] = useState<"raw" | "skill">("raw");
  const [variantCount, setVariantCount] = useState(DEFAULT_VARIANT_COUNT);
  const [modelEfforts, setModelEfforts] = useState<Record<string, ReasoningEffort>>({});
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const promptDropdownRef = useRef<HTMLDivElement>(null);

  const modelGroups = getModelGroups();

  // Close prompt dropdown on click outside
  useEffect(() => {
    if (!promptDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (promptDropdownRef.current && !promptDropdownRef.current.contains(e.target as Node)) {
        setPromptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [promptDropdownOpen]);

  // Clean up modelEfforts when models are deselected
  useEffect(() => {
    setModelEfforts((prev) => {
      const next: Record<string, ReasoningEffort> = {};
      let changed = false;
      for (const [id, effort] of Object.entries(prev)) {
        if (selectedModels.has(id)) {
          next[id] = effort;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedModels]);


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

  /** Set effort for a single model */
  const setModelEffort = (modelId: string, effort: ReasoningEffort) => {
    setModelEfforts((prev) => {
      if (effort === "none") {
        // Remove from map when set to "none" (default)
        if (!(modelId in prev)) return prev;
        const next = { ...prev };
        delete next[modelId];
        return next;
      }
      if (prev[modelId] === effort) return prev;
      return { ...prev, [modelId]: effort };
    });
  };

  /** Bulk-set all reasoning-capable selected models to a given effort */
  const setAllEfforts = (effort: ReasoningEffort) => {
    const next: Record<string, ReasoningEffort> = {};
    for (const model of DEFAULT_MODELS) {
      if (
        selectedModels.has(model.id) &&
        model.reasoningEfforts &&
        model.reasoningEfforts.length > 0
      ) {
        if (effort === "none") continue; // omit = none
        if (model.reasoningEfforts.includes(effort)) {
          next[model.id] = effort;
        } else if (model.reasoningMode === "toggle") {
          // Any non-none effort maps to "on" for toggle-only models
          next[model.id] = "on";
        }
      }
    }
    setModelEfforts(next);
  };

  // Check if any selected model supports reasoning
  const anySelectedSupportsReasoning = DEFAULT_MODELS.some(
    (m) => selectedModels.has(m.id) && m.reasoningEfforts && m.reasoningEfforts.length > 0
  );

  // Compute active efforts summary for display
  const activeEfforts = Object.entries(modelEfforts).filter(
    ([, effort]) => effort !== "none"
  );

  const canGenerate = useCallback(() => {
    const hasApiKey = !!localStorage.getItem("openrouter-api-key");
    const hasPrompt =
      selectedPromptId !== "custom" || customPrompt.trim().length > 0;
    const hasModels = selectedModels.size > 0;
    return hasApiKey && hasPrompt && hasModels && progress.status !== "generating";
  }, [selectedPromptId, customPrompt, selectedModels, progress.status]);

  const handleGenerate = () => {
    const params: GenerateParams = {
      models: Array.from(selectedModels),
      mode,
      variantCount,
    };

    // Send per-model efforts (only non-none entries)
    if (activeEfforts.length > 0) {
      params.modelEfforts = modelEfforts;
    }

    if (selectedPromptId === "custom") {
      params.prompt = customPrompt.trim();
    } else {
      params.promptId = selectedPromptId;
    }

    onStartGeneration(params);
  };

  if (!open) return null;

  const hasApiKey =
    typeof window !== "undefined" &&
    !!localStorage.getItem("openrouter-api-key");
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const etaMs = getEstimatedTimeRemaining?.();
  const eta = etaMs != null
    ? etaMs < 1000
      ? "< 1s"
      : etaMs < 60000
        ? `~${Math.ceil(etaMs / 1000)}s`
        : `~${Math.ceil(etaMs / 60000)}m`
    : null;

  /** Build short reasoning summary for the status bar */
  const reasoningSummary = (() => {
    if (activeEfforts.length === 0) return null;
    return activeEfforts
      .map(([modelId, effort]) => {
        const model = DEFAULT_MODELS.find((m) => m.id === modelId);
        // Short name: take last meaningful segment
        const shortName = model
          ? model.name.replace(/^(Claude |GPT-|Gemini |DeepSeek |Qwen3 |Kimi |GLM |MiniMax )/, "")
          : modelId;
        return `${shortName}->${EFFORT_LABELS[effort].short}`;
      })
      .join(", ");
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] max-w-3xl mx-auto z-50 backdrop-blur-xl bg-[#0a0a1a]/90 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden aurora-border-glow">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-sora)]">
            New Benchmark Run
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
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
            <div className="flex items-center gap-3 bg-amber-500/10 text-amber-400 px-4 py-3 rounded-lg text-sm border border-amber-500/20 backdrop-blur-sm">
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
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "backdrop-blur-sm bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:border-white/[0.12] hover:text-gray-300"
                    }`}
                  >
                    {cat}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedCategory === cat
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-white/[0.06] text-gray-500"
                      }`}
                    >
                      {categoryCounts[cat] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div ref={promptDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setPromptDropdownOpen(!promptDropdownOpen)}
                className="w-full flex items-center justify-between backdrop-blur-sm bg-white/[0.04] text-gray-200 rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] hover:border-white/[0.14] focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all text-left"
              >
                <span className="truncate">
                  {selectedPromptId === "custom"
                    ? "Custom prompt..."
                    : filteredPrompts.find((p) => p.id === selectedPromptId)?.title ?? "Select prompt..."}
                </span>
                <svg className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${promptDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {promptDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg backdrop-blur-xl bg-[#0a0a1a]/95 border border-white/[0.1] shadow-2xl max-h-60 overflow-auto">
                  <div
                    onClick={() => { setSelectedPromptId("custom"); setPromptDropdownOpen(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedPromptId === "custom"
                        ? "bg-purple-500/15 text-purple-300"
                        : "text-gray-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Custom prompt...
                  </div>
                  {filteredPrompts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPromptId(p.id); setPromptDropdownOpen(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors border-t border-white/[0.04] ${
                        selectedPromptId === p.id
                          ? "bg-purple-500/15 text-purple-300"
                          : "text-gray-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span>{p.title}</span>
                      <span className="text-gray-500 ml-2 text-xs">{p.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPromptId === "custom" ? (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Build a modern landing page for a SaaS product..."
                rows={4}
                className="w-full backdrop-blur-sm bg-white/[0.04] text-gray-200 rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
              />
            ) : selectedPrompt ? (
              <div className="backdrop-blur-sm bg-white/[0.03] rounded-lg px-4 py-3 text-sm text-gray-400 border border-white/[0.06]">
                <p className="text-gray-500 text-xs mb-1">
                  {selectedPrompt.description}
                </p>
                <p className="line-clamp-3">{selectedPrompt.prompt}</p>
              </div>
            ) : null}
          </div>

          {/* Model Selection -- grouped by provider */}
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
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
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
                  <div className="space-y-1.5">
                    {group.models.map((model) => {
                      const isSelected = selectedModels.has(model.id);
                      const hasReasoning = model.reasoningEfforts && model.reasoningEfforts.length > 0;
                      const currentEffort = modelEfforts[model.id] ?? "none";
                      const showEffortPicker = isSelected && hasReasoning;

                      return (
                        <div key={model.id} className="space-y-0">
                          {/* Model card row */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleModel(model.id)}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all border flex-1 min-w-0 ${
                                isSelected
                                  ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                  : "backdrop-blur-sm bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/[0.12]"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-purple-600 border-purple-500"
                                    : "border-gray-600"
                                }`}
                              >
                                {isSelected && (
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
                              {hasReasoning && (
                                <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0" title="Supports reasoning">
                                  R
                                </span>
                              )}
                            </button>

                            {/* Inline effort picker pills */}
                            {showEffortPicker && (
                              <div className="flex gap-0.5 shrink-0">
                                {(["none", ...model.reasoningEfforts!.filter((e) => e !== "none")] as ReasoningEffort[]).map(
                                  (effort) => (
                                    <button
                                      key={effort}
                                      onClick={() => setModelEffort(model.id, effort)}
                                      title={effort === "none" ? "No reasoning" : `Reasoning: ${effort}`}
                                      className={`px-1.5 py-1 rounded text-[10px] font-medium transition-all ${
                                        currentEffort === effort
                                          ? effort === "none"
                                            ? "bg-white/[0.08] text-gray-200"
                                            : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                                          : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
                                      }`}
                                    >
                                      {EFFORT_LABELS[effort].label}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* "Set all" shortcut -- only when reasoning models are selected */}
            {anySelectedSupportsReasoning && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-500">Set all reasoning:</span>
                <div className="flex gap-0.5">
                  {(["none", "low", "medium", "high"] as ReasoningEffort[]).map((effort) => (
                    <button
                      key={effort}
                      onClick={() => setAllEfforts(effort)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
                    >
                      {EFFORT_LABELS[effort].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                    ? "bg-white/[0.08] border-white/[0.12] text-white"
                    : "backdrop-blur-sm bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/[0.1]"
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
                    ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                    : "backdrop-blur-sm bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/[0.1]"
                }`}
              >
                <div className="font-medium">Skill-Augmented</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Prepend frontend-design skill
                </div>
              </button>
            </div>
          </div>

          {/* Variant Count */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Variants per Model
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setVariantCount((v) => Math.max(MIN_VARIANT_COUNT, v - 1))}
                disabled={variantCount <= MIN_VARIANT_COUNT}
                className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-white/[0.12] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <span className="text-lg font-semibold text-white w-8 text-center">
                {variantCount}
              </span>
              <button
                onClick={() => setVariantCount((v) => Math.min(MAX_VARIANT_COUNT, v + 1))}
                disabled={variantCount >= MAX_VARIANT_COUNT}
                className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-white/[0.12] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <span className="text-xs text-gray-500">
                {variantCount === 1
                  ? "Single design per model"
                  : `${variantCount} unique designs per model`}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="backdrop-blur-sm bg-white/[0.03] rounded-lg px-4 py-3 text-sm text-gray-400 border border-white/[0.06]">
            Will generate{" "}
            <span className="text-white font-medium">
              {selectedModels.size * variantCount}
            </span>{" "}
            designs ({selectedModels.size} model
            {selectedModels.size !== 1 ? "s" : ""} x {variantCount} variant
            {variantCount !== 1 ? "s" : ""})
            {reasoningSummary && (
              <span className="text-amber-400"> &middot; reasoning: {reasoningSummary}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 space-y-3">
          {/* Progress */}
          {progress.status !== "idle" && (
            <div className="space-y-3">
              {/* Status message */}
              <div
                className={`text-sm flex items-center gap-2 ${
                  progress.status === "generating"
                    ? "text-purple-400"
                    : progress.status === "complete"
                      ? "text-teal-400"
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
                    {eta && ` &middot; ${eta} remaining`}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {progress.status === "generating" && progress.total > 0 && (
                <div className="space-y-1">
                  <div className="w-full backdrop-blur-sm bg-white/[0.04] rounded-full h-2 border border-white/[0.06]">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-teal-500 h-full rounded-full transition-all duration-500"
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
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs backdrop-blur-sm border ${
                            ms.error
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : done
                                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                : ms.completed > 0
                                  ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                  : "bg-white/[0.03] text-gray-500 border-white/[0.06]"
                          }`}
                        >
                          {done ? (
                            ms.error ? (
                              <span>!</span>
                            ) : (
                              <span>ok</span>
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
                  onClick={onClose}
                  className="px-4 py-3 rounded-lg text-sm font-semibold backdrop-blur-sm bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1] transition-all"
                >
                  Minimize
                </button>
                <button
                  onClick={onCancelGeneration}
                  className="px-4 py-3 rounded-lg text-sm font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white/60 cursor-not-allowed"
                >
                  Generating...
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate()}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/25"
              >
                Generate {selectedModels.size * variantCount} Designs
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
