"use client";

import { useState } from "react";
import { Run, GenerationResult } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";
import { formatCost } from "@/lib/utils";
import ComparisonSlot from "./ComparisonSlot";

interface GalleryProps {
  run: Run;
  onFullscreen: (modelId: string, variant: number) => void;
  isGenerating?: boolean;
}

/** Grid view of all designs from a benchmark run, grouped by model. */
export default function Gallery({ run, onFullscreen, isGenerating }: GalleryProps) {
  const modelNameMap: Record<string, string> = {};
  for (const m of DEFAULT_MODELS) {
    modelNameMap[m.id] = m.name;
  }
  // Also add model ids from the run itself for unknown models
  for (const mId of run.models) {
    if (!modelNameMap[mId]) {
      modelNameMap[mId] = mId;
    }
  }

  // Calculate total run cost
  const totalRunCost = run.models.reduce((sum, modelId) => {
    const results = run.designs[modelId] || [];
    return sum + results.reduce((mSum, r) => mSum + (r.cost ?? 0), 0);
  }, 0);

  // Track which model each slot shows
  const [slotModels, setSlotModels] = useState<Record<string, string>>(
    () => Object.fromEntries(run.models.map((m) => [m, m]))
  );

  const handleModelChange = (slotKey: string, newModelId: string) => {
    setSlotModels((prev) => ({ ...prev, [slotKey]: newModelId }));
  };

  return (
    <div className="p-6 space-y-8">
      {/* Run info header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-sora)]">{run.promptTitle}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${
            run.mode === "skill"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "bg-white/[0.06] text-gray-400 border border-white/[0.08]"
          }`}>
            {run.mode}
          </span>
          {totalRunCost > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-500/15 text-teal-300 border border-teal-500/25 backdrop-blur-sm">
              Total: {formatCost(totalRunCost)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 max-w-3xl line-clamp-2">{run.prompt}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{run.models.length} models &middot; {run.totalVariants} variants</span>
          <span>{new Date(run.date).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Design grid -- one ComparisonSlot per model */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {run.models.map((originalModelId) => {
          const displayModelId = slotModels[originalModelId] || originalModelId;
          const results: GenerationResult[] = run.designs[displayModelId] || [];
          const modelName = modelNameMap[displayModelId] || displayModelId;

          return (
            <div key={originalModelId} className="h-[600px]">
              <ComparisonSlot
                results={results}
                modelId={displayModelId}
                modelName={modelName}
                allModels={run.models}
                modelNames={modelNameMap}
                onModelChange={(newId) => handleModelChange(originalModelId, newId)}
                onFullscreen={onFullscreen}
                isGenerating={isGenerating}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
