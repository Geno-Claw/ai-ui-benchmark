"use client";

interface ModelPickerProps {
  models: string[];
  modelNames: Record<string, string>;
  selectedModelId: string;
  onSelect: (modelId: string) => void;
}

/** Button group / pills showing available models for swapping in a comparison slot. */
export default function ModelPicker({
  models,
  modelNames,
  selectedModelId,
  onSelect,
}: ModelPickerProps) {
  if (models.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {models.map((modelId) => (
        <button
          key={modelId}
          onClick={() => onSelect(modelId)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
            modelId === selectedModelId
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          }`}
        >
          {modelNames[modelId] || modelId}
        </button>
      ))}
    </div>
  );
}
