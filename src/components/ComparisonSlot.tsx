"use client";

import { GenerationResult } from "@/lib/types";

interface ComparisonSlotProps {
  result: GenerationResult;
  modelName: string;
  variantIndex: number;
}

/** Single design preview slot — renders generated HTML in a sandboxed iframe. */
export default function ComparisonSlot({
  result,
  modelName,
  variantIndex,
}: ComparisonSlotProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-300">{modelName}</span>
        <span className="text-xs text-gray-500">
          Variant {variantIndex + 1}
        </span>
      </div>
      <div className="aspect-video bg-white">
        <iframe
          sandbox="allow-scripts"
          srcDoc={result.html}
          className="w-full h-full border-0"
          title={`${modelName} variant ${variantIndex + 1}`}
        />
      </div>
      <div className="flex gap-4 px-4 py-2 text-xs text-gray-500">
        <span>{result.tokens.input + result.tokens.output} tokens</span>
        <span>{result.durationMs}ms</span>
        {result.cost !== undefined && <span>${result.cost.toFixed(4)}</span>}
      </div>
    </div>
  );
}
