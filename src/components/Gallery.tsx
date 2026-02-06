"use client";

import { Run } from "@/lib/types";

interface GalleryProps {
  run: Run | null;
}

/** Grid view of all designs from a benchmark run. */
export default function Gallery({ run }: GalleryProps) {
  if (!run) {
    return (
      <div className="text-center text-gray-500 py-12">
        No run selected. Start a benchmark or pick an archived run.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {/* TODO: Render ComparisonSlot for each model's designs */}
      <p className="text-gray-500 col-span-full text-center">
        Gallery view — coming soon
      </p>
    </div>
  );
}
