"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { RunSummary } from "@/lib/types";

interface RunSelectorProps {
  runs: RunSummary[];
  currentRunId: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
}

type ModeFilter = "all" | "raw" | "skill";

/** Dropdown listing all archived runs with search, filter, and delete. */
export default function RunSelector({
  runs,
  currentRunId,
  onSelect,
  onDelete,
}: RunSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const currentRun = runs.find((r) => r.id === currentRunId);

  // Close model dropdown on click outside
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelDropdownOpen]);

  // Collect all unique models across runs
  const allModels = useMemo(() => {
    const models = new Set<string>();
    for (const run of runs) {
      for (const m of run.models) {
        models.add(m);
      }
    }
    return Array.from(models).sort();
  }, [runs]);

  // Filter runs
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Search filter -- match on promptTitle or prompt content
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = run.promptTitle.toLowerCase().includes(q);
        const matchesPrompt = run.prompt.toLowerCase().includes(q);
        const matchesId = run.id.toLowerCase().includes(q);
        if (!matchesTitle && !matchesPrompt && !matchesId) return false;
      }

      // Mode filter
      if (modeFilter !== "all" && run.mode !== modeFilter) return false;

      // Model filter
      if (modelFilter && !run.models.includes(modelFilter)) return false;

      return true;
    });
  }, [runs, searchQuery, modeFilter, modelFilter]);

  const hasActiveFilters = searchQuery !== "" || modeFilter !== "all" || modelFilter !== null;

  const clearFilters = () => {
    setSearchQuery("");
    setModeFilter("all");
    setModelFilter(null);
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to let the dropdown render
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen]);

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

  const handleClose = () => {
    setIsOpen(false);
    // Don't clear filters on close -- preserve state for UX
  };

  if (runs.length === 0) {
    return (
      <div className="text-sm text-gray-500 px-3 py-2">No runs yet</div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.04] text-gray-200 rounded-lg px-3 py-2 text-sm border border-white/[0.08] hover:border-white/[0.15] focus:border-purple-500/50 focus:outline-none transition-all min-w-[200px] max-w-[360px]"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="truncate flex-1 text-left">
          {currentRun ? `${currentRun.promptTitle} (${currentRun.mode})` : "Select a run..."}
        </span>
        {hasActiveFilters && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-purple-500" title="Filters active" />
        )}
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={handleClose} />

          {/* Dropdown Panel */}
          <div className="absolute top-full left-0 mt-1 z-40 w-[420px] rounded-xl border border-white/[0.08] backdrop-blur-xl bg-[#0a0a1a]/90 shadow-2xl flex flex-col max-h-[80vh]">
            {/* Search & Filters -- sticky top */}
            <div className="p-3 border-b border-white/[0.06] space-y-2.5 shrink-0">
              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by prompt, title, or run ID..."
                  className="w-full backdrop-blur-sm bg-white/[0.04] text-gray-300 text-sm rounded-lg pl-8 pr-8 py-1.5 border border-white/[0.08] focus:border-purple-500/50 focus:outline-none placeholder:text-gray-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mode Filter Chips */}
                <div className="flex items-center gap-1">
                  {(["all", "raw", "skill"] as ModeFilter[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setModeFilter(mode)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                        modeFilter === mode
                          ? mode === "skill"
                            ? "bg-purple-500/25 text-purple-300 border border-purple-500/40"
                            : mode === "raw"
                            ? "bg-white/[0.1] text-gray-200 border border-white/[0.15]"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          : "bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:border-white/[0.12] hover:text-gray-400"
                      }`}
                    >
                      {mode === "all" ? "All" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Model Filter Dropdown */}
                {allModels.length > 0 && (
                  <div ref={modelDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="flex items-center gap-1 backdrop-blur-sm bg-white/[0.04] text-xs text-gray-400 rounded-full px-2 py-0.5 border border-white/[0.08] hover:border-white/[0.12] cursor-pointer transition-all"
                    >
                      <span className="truncate max-w-[120px]">{modelFilter ?? "Any model"}</span>
                      <svg className={`w-3 h-3 shrink-0 transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {modelDropdownOpen && (
                      <div className="absolute z-50 mt-1 left-0 min-w-[200px] rounded-lg backdrop-blur-xl bg-[#0a0a1a]/95 border border-white/[0.1] shadow-2xl max-h-48 overflow-auto">
                        <div
                          onClick={() => { setModelFilter(null); setModelDropdownOpen(false); }}
                          className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                            modelFilter === null
                              ? "bg-purple-500/15 text-purple-300"
                              : "text-gray-300 hover:bg-white/[0.08]"
                          }`}
                        >
                          Any model
                        </div>
                        {allModels.map((m) => (
                          <div
                            key={m}
                            onClick={() => { setModelFilter(m); setModelDropdownOpen(false); }}
                            className={`px-3 py-1.5 text-xs cursor-pointer transition-colors border-t border-white/[0.04] truncate ${
                              modelFilter === m
                                ? "bg-purple-500/15 text-purple-300"
                                : "text-gray-300 hover:bg-white/[0.08]"
                            }`}
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>

              {/* Result Count */}
              <div className="text-xs text-gray-500">
                {filteredRuns.length === runs.length
                  ? `${runs.length} run${runs.length !== 1 ? "s" : ""}`
                  : `${filteredRuns.length} of ${runs.length} run${runs.length !== 1 ? "s" : ""}`}
              </div>
            </div>

            {/* Run List -- scrollable */}
            <div className="overflow-auto flex-1">
              {filteredRuns.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">No matching runs</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredRuns.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => {
                      onSelect(run.id);
                      handleClose();
                    }}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-b border-white/[0.04] last:border-b-0 ${
                      run.id === currentRunId
                        ? "bg-purple-500/10 text-white"
                        : "hover:bg-white/[0.04] text-gray-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {run.promptTitle}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          run.mode === "skill"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-white/[0.06] text-gray-400"
                        }`}>
                          {run.mode}
                        </span>
                        <span className="text-xs text-gray-500">
                          {run.models.length} model{run.models.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-gray-500">
                          {run.totalVariants} variant{run.totalVariants !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatDate(run.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, run.id)}
                      className={`shrink-0 p-1 rounded transition-all ${
                        deleteConfirm === run.id
                          ? "bg-red-600 text-white"
                          : "text-gray-500 hover:text-red-400 hover:bg-white/[0.06]"
                      }`}
                      title={deleteConfirm === run.id ? "Click again to confirm" : "Delete run"}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
