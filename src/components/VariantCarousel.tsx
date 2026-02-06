"use client";

import { useState } from "react";
import { GenerationResult } from "@/lib/types";

interface VariantCarouselProps {
  variants: GenerationResult[];
  modelName: string;
}

/** Carousel to cycle through variant designs from a single model. */
export default function VariantCarousel({
  variants,
  modelName,
}: VariantCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (variants.length === 0) {
    return <div className="text-gray-500">No variants available.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{modelName}</span>
        <div className="flex gap-1">
          {variants.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                i === current
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      {/* TODO: Render current variant via ComparisonSlot */}
      <div className="text-gray-500 text-sm">
        Showing variant {current + 1} of {variants.length}
      </div>
    </div>
  );
}
