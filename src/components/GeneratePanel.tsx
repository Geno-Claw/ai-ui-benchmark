"use client";

import { useState, useEffect, useCallback } from "react";
import { PromptConfig } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";

interface GeneratePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (runId: string) => void;
}

interface GenerationProgress {
  status: "idle" | "generating" | "complete" | "error";
  message: string;
  current: number;
  total: number;
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
  const [progress, setProgress] = useState<GenerationProgress>({
    status: "idle",
    message: "",
    current: 0,
    total: 0,
  });

  // Load prompts from API
  useEffect(() => {
    if (isOpen) {
      fetch("/api/prompts")
        .then((res) => res.json())
        .then((data: PromptConfig[]) => setPrompts(data))
        .catch(() => setPrompts([]));
    }
  }, [isOpen]);

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
        // Don't allow deselecting all
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

  const canGenerate = useCallback(() => {
    const hasApiKey = !!localStorage.getItem("openrouter-api-key");
    const hasPrompt =
      selectedPromptId !== "custom" || customPrompt.trim().length > 0;
    const hasModels = selectedModels.size > 0;
    return hasApiKey && hasPrompt && hasModels && progress.status !== "generating";
  }, [selectedPromptId, customPrompt, selectedModels, progress.status]);

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

    const totalVariants = selectedModels.size * 5;
    setProgress({
      status: "generating",
      message: "Starting benchmark…",
      current: 0,
      total: totalVariants,
    });

    try {
      const body: Record<string, unknown> = {
        models: Array.from(selectedModels),
        mode,
      };

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
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setProgress({
        status: "complete",
        message: "Benchmark complete!",
        current: totalVariants,
        total: totalVariants,
      });

      // Notify parent with the new run ID
      setTimeout(() => {
        onComplete(data.id);
        setProgress({ status: "idle", message: "", current: 0, total: 0 });
      }, 1000);
    } catch (err) {
      setProgress({
        status: "error",
        message: err instanceof Error ? err.message : "Generation failed",
        current: 0,
        total: 0,
      });
    }
  };

  if (!isOpen) return null;

  const hasApiKey = typeof window !== "undefined" && !!localStorage.getItem("openrouter-api-key");
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={progress.status !== "generating" ? onClose : undefined} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] max-w-2xl mx-auto z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-white">New Benchmark Run</h2>
          <button
            onClick={onClose}
            disabled={progress.status === "generating"}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* API Key Warning */}
          {!hasApiKey && (
            <div className="flex items-center gap-3 bg-amber-500/10 text-amber-400 px-4 py-3 rounded-lg text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                      // Reset to custom if current selection is filtered out
                      if (
                        cat !== "All" &&
                        selectedPromptId !== "custom" &&
                        !prompts.find(
                          (p) => p.id === selectedPromptId && p.category === cat
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
                <p className="text-gray-500 text-xs mb-1">{selectedPrompt.description}</p>
                <p className="line-clamp-3">{selectedPrompt.prompt}</p>
              </div>
            ) : null}
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Models
              </label>
              <button
                onClick={selectAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Select all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all border ${
                    selectedModels.has(model.id)
                      ? "bg-blue-600/10 border-blue-500/50 text-blue-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedModels.has(model.id)
                      ? "bg-blue-600 border-blue-500"
                      : "border-gray-600"
                  }`}>
                    {selectedModels.has(model.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {model.name}
                </button>
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

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-400">
            Will generate <span className="text-white font-medium">{selectedModels.size * 5}</span> designs
            ({selectedModels.size} model{selectedModels.size !== 1 ? "s" : ""} × 5 variants)
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 space-y-3">
          {/* Progress */}
          {progress.status !== "idle" && (
            <div className="space-y-2">
              <div className={`text-sm flex items-center gap-2 ${
                progress.status === "generating"
                  ? "text-blue-400"
                  : progress.status === "complete"
                    ? "text-green-400"
                    : "text-red-400"
              }`}>
                {progress.status === "generating" && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {progress.status === "complete" && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {progress.status === "error" && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {progress.message}
              </div>
              {progress.status === "generating" && progress.total > 0 && (
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate()}
            className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {progress.status === "generating"
              ? "Generating…"
              : `Generate ${selectedModels.size * 5} Designs`}
          </button>
        </div>
      </div>
    </>
  );
}
