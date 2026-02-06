"use client";

import { RunSummary } from "@/lib/types";

interface RunSelectorProps {
  runs: RunSummary[];
  currentRunId: string | null;
  onSelect: (runId: string) => void;
}

/** Dropdown to pick which archived run to view. */
export default function RunSelector({
  runs,
  currentRunId,
  onSelect,
}: RunSelectorProps) {
  if (runs.length === 0) {
    return (
      <div className="text-sm text-gray-500">No archived runs yet.</div>
    );
  }

  return (
    <select
      value={currentRunId ?? ""}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
    >
      <option value="" disabled>
        Select a run…
      </option>
      {runs.map((run) => (
        <option key={run.id} value={run.id}>
          {run.date} — {run.promptTitle} ({run.mode})
        </option>
      ))}
    </select>
  );
}
