"use client";

import { useState } from "react";
import { Run, GenerationResult } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";
import ComparisonSlot from "./ComparisonSlot";

interface GalleryProps {
  run: Run;
  onFullscreen: (modelId: string, variant: number) => void;
}

/** Grid view of all designs from a benchmark run, grouped by model. */
export default function Gallery({ run, onFullscreen }: GalleryProps) {
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
          <h2 className="text-xl font-semibold text-white">{run.promptTitle}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            run.mode === "skill"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "bg-gray-700 text-gray-400 border border-gray-600"
          }`}>
            {run.mode}
          </span>
        </div>
        <p className="text-sm text-gray-500 max-w-3xl line-clamp-2">{run.prompt}</p>
      </div>

      {/* Design grid — one ComparisonSlot per model */}
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
