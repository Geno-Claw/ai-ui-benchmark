"use client";

import { useState } from "react";
import { GenerationResult } from "@/lib/types";
import SourceView from "./SourceView";
import VariantCarousel from "./VariantCarousel";
import ModelPicker from "./ModelPicker";

interface ComparisonSlotProps {
  results: GenerationResult[];
  modelId: string;
  modelName: string;
  allModels: string[];
  modelNames: Record<string, string>;
  onModelChange: (modelId: string) => void;
  onFullscreen?: (modelId: string, variant: number) => void;
  isFullscreen?: boolean;
  onCloseFullscreen?: () => void;
}

const ZOOM_LEVELS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1.0 },
];

/** Single design preview slot — renders generated HTML in a sandboxed iframe with controls. */
export default function ComparisonSlot({
  results,
  modelId,
  modelName,
  allModels,
  modelNames,
  onModelChange,
  onFullscreen,
  isFullscreen,
  onCloseFullscreen,
}: ComparisonSlotProps) {
  const [currentVariant, setCurrentVariant] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const result = results[currentVariant];

  if (!result) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No design data available</p>
      </div>
    );
  }

  const totalTokens = result.tokens.input + result.tokens.output;
  const durationSec = (result.durationMs / 1000).toFixed(1);

  return (
    <div className={`flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ModelPicker
            models={allModels}
            modelNames={modelNames}
            selectedModelId={modelId}
            onSelect={onModelChange}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <VariantCarousel
            totalVariants={results.length}
            currentVariant={currentVariant}
            onSelect={setCurrentVariant}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-800/50 bg-gray-900/80 shrink-0">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {durationSec}s
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {totalTokens.toLocaleString()} tokens
          </span>
          {result.cost !== undefined && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ${result.cost.toFixed(4)}
            </span>
          )}
          {result.error && (
            <span className="text-red-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          {!showSource && (
            <div className="flex items-center gap-0.5 mr-2">
              {ZOOM_LEVELS.map((z) => (
                <button
                  key={z.label}
                  onClick={() => setZoom(z.value)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    zoom === z.value
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          )}
          {/* Toggle preview/source */}
          <button
            onClick={() => setShowSource(!showSource)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showSource
                ? "bg-blue-600/20 text-blue-400"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {showSource ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Source
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </>
            )}
          </button>
          {/* Fullscreen toggle */}
          {isFullscreen ? (
            <button
              onClick={onCloseFullscreen}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Exit fullscreen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => onFullscreen?.(modelId, currentVariant)}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 bg-white relative">
        {showSource ? (
          <div className="absolute inset-0">
            <SourceView html={result.html} />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-auto">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
              }}
            >
              <iframe
                sandbox="allow-scripts"
                srcDoc={result.html}
                className="w-full h-full border-0"
                title={`${modelName} - Variant ${currentVariant + 1}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
