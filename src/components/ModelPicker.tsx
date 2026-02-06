"use client";

import { ModelConfig } from "@/lib/types";

interface ModelPickerProps {
  models: ModelConfig[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
}

/** Button group to swap which model's output is displayed in a slot. */
export default function ModelPicker({
  models,
  selectedModelId,
  onSelect,
}: ModelPickerProps) {
  return (
    <div className="flex gap-1">
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => onSelect(model.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            model.id === selectedModelId
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {model.name}
        </button>
      ))}
    </div>
  );
}
