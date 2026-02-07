"use client";

interface VariantCarouselProps {
  totalVariants: number;
  currentVariant: number;
  onSelect: (variant: number) => void;
}

/** Tab strip with dot indicators to cycle through variant designs. */
export default function VariantCarousel({
  totalVariants,
  currentVariant,
  onSelect,
}: VariantCarouselProps) {
  if (totalVariants <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onSelect(Math.max(0, currentVariant - 1))}
        disabled={currentVariant === 0}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Previous variant"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {Array.from({ length: totalVariants }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-7 h-7 rounded text-xs font-medium transition-all ${
            i === currentVariant
              ? "bg-purple-600/80 text-white shadow-lg shadow-purple-600/25 border border-purple-500/40"
              : "backdrop-blur-sm bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 border border-white/[0.06]"
          }`}
          aria-label={`Variant ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
      <button
        onClick={() => onSelect(Math.min(totalVariants - 1, currentVariant + 1))}
        disabled={currentVariant === totalVariants - 1}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Next variant"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
