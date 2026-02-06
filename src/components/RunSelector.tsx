"use client";

import { useState } from "react";
import { RunSummary } from "@/lib/types";

interface RunSelectorProps {
  runs: RunSummary[];
  currentRunId: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
}

/** Dropdown listing all archived runs with delete capability. */
export default function RunSelector({
  runs,
  currentRunId,
  onSelect,
  onDelete,
}: RunSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentRun = runs.find((r) => r.id === currentRunId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (deleteConfirm === runId) {
      onDelete(runId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(runId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (runs.length === 0) {
    return (
      <div className="text-sm text-gray-500 px-3 py-2">No runs yet</div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700 hover:border-gray-600 focus:border-blue-500 focus:outline-none transition-colors min-w-[200px] max-w-[360px]"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="truncate flex-1 text-left">
          {currentRun ? `${currentRun.promptTitle} (${currentRun.mode})` : "Select a run…"}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 w-96 max-h-80 overflow-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => {
                  onSelect(run.id);
                  setIsOpen(false);
                }}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-700/50 last:border-b-0 ${
                  run.id === currentRunId
                    ? "bg-blue-600/10 text-white"
                    : "hover:bg-gray-700/50 text-gray-300"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {run.promptTitle}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      run.mode === "skill"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {run.mode}
                    </span>
                    <span className="text-xs text-gray-500">
                      {run.models.length} model{run.models.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDate(run.date)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, run.id)}
                  className={`shrink-0 p-1 rounded transition-colors ${
                    deleteConfirm === run.id
                      ? "bg-red-600 text-white"
                      : "text-gray-500 hover:text-red-400 hover:bg-gray-700"
                  }`}
                  title={deleteConfirm === run.id ? "Click again to confirm" : "Delete run"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
