"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ProgressState } from "@/hooks/useBackgroundGeneration";
import { DEFAULT_MODELS } from "@/lib/config";
import { formatCost } from "@/lib/utils";

interface GenerationIndicatorProps {
  progress: ProgressState;
  onClick: () => void;
}

export default function GenerationIndicator({
  progress,
  onClick,
}: GenerationIndicatorProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoverOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => {
      setHoverOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Pill button with embedded progress bar */}
      <button
        onClick={onClick}
        className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-blue-300 border border-blue-500/40 hover:border-blue-400/60 transition-colors cursor-pointer"
      >
        {/* Progress fill */}
        <div
          className="absolute inset-0 bg-blue-600/20 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="hidden sm:inline">Generating </span>
          <span>
            {progress.current}/{progress.total}
          </span>
          <span className="text-blue-400/60 ml-0.5">{percentage}%</span>
        </span>
      </button>

      {/* Hover popover */}
      {hoverOpen && progress.modelStatuses && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900 shadow-xl p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Model Progress</span>
            <span>{percentage}% complete</span>
          </div>

          {/* Per-model rows */}
          <div className="space-y-2">
            {Object.entries(progress.modelStatuses).map(([modelId, ms]) => {
              const modelName =
                DEFAULT_MODELS.find((m) => m.id === modelId)?.name || modelId;
              const done = ms.completed >= ms.total;
              const modelPct =
                ms.total > 0
                  ? Math.round((ms.completed / ms.total) * 100)
                  : 0;

              return (
                <div key={modelId} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {/* Status icon */}
                    {done ? (
                      ms.error ? (
                        <span className="text-red-400">⚠</span>
                      ) : (
                        <span className="text-green-400">✓</span>
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

                    <span
                      className={`truncate flex-1 ${
                        ms.error
                          ? "text-red-400"
                          : done
                            ? "text-green-400"
                            : ms.completed > 0
                              ? "text-blue-300"
                              : "text-gray-500"
                      }`}
                    >
                      {modelName}
                    </span>

                    <span className="font-mono text-gray-500">
                      {ms.completed}/{ms.total}
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${
                        ms.error
                          ? "bg-red-500"
                          : done
                            ? "bg-green-500"
                            : "bg-blue-600"
                      }`}
                      style={{ width: `${modelPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: cost */}
          {(progress.cost ?? 0) > 0 && (
            <div className="pt-1 border-t border-gray-700/50 text-xs text-gray-500">
              Cost so far: {formatCost(progress.cost)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
