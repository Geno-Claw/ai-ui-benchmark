"use client";

import { useState, useEffect, useCallback } from "react";
import { RunSummary, Run, GenerationResult } from "@/lib/types";
import { DEFAULT_MODELS } from "@/lib/config";
import RunSelector from "@/components/RunSelector";
import Gallery from "@/components/Gallery";
import ComparisonSlot from "@/components/ComparisonSlot";
import Settings from "@/components/Settings";
import GeneratePanel from "@/components/GeneratePanel";

/** Build a model name lookup from DEFAULT_MODELS. */
function buildModelNames(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of DEFAULT_MODELS) {
    map[m.id] = m.name;
  }
  return map;
}

export default function Home() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState<{ modelId: string; variant: number } | null>(null);

  const modelNames = buildModelNames();

  // Load runs on mount
  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const res = await fetch("/api/runs");
      const data: RunSummary[] = await res.json();
      setRuns(data);
      // Auto-select the first run if none selected
      if (data.length > 0 && !currentRunId) {
        setCurrentRunId(data[0].id);
      }
    } catch {
      // Silently handle - empty state will show
    } finally {
      setLoading(false);
    }
  };

  // Load full run data when currentRunId changes
  useEffect(() => {
    if (!currentRunId) {
      setCurrentRun(null);
      return;
    }
    setRunLoading(true);
    fetch(`/api/runs/${currentRunId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Run) => setCurrentRun(data))
      .catch(() => setCurrentRun(null))
      .finally(() => setRunLoading(false));
  }, [currentRunId]);

  const handleDeleteRun = async (runId: string) => {
    try {
      await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      if (currentRunId === runId) {
        const remaining = runs.filter((r) => r.id !== runId);
        setCurrentRunId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch {
      // Ignore delete errors
    }
  };

  const handleGenerateComplete = useCallback(
    (runId: string) => {
      setGenerateOpen(false);
      loadRuns().then(() => setCurrentRunId(runId));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFullscreen = (modelId: string, variant: number) => {
    setFullscreen({ modelId, variant });
  };

  // Fullscreen overlay
  const renderFullscreen = () => {
    if (!fullscreen || !currentRun) return null;

    const results: GenerationResult[] =
      currentRun.designs[fullscreen.modelId] || [];
    const modelName = modelNames[fullscreen.modelId] || fullscreen.modelId;

    // Also add model names from the run
    const runModelNames = { ...modelNames };
    for (const mId of currentRun.models) {
      if (!runModelNames[mId]) runModelNames[mId] = mId;
    }

    return (
      <>
        <div
          className="fixed inset-0 bg-black/70 z-40"
          onClick={() => setFullscreen(null)}
        />
        <div className="fixed inset-4 z-50">
          <ComparisonSlot
            results={results}
            modelId={fullscreen.modelId}
            modelName={modelName}
            allModels={currentRun.models}
            modelNames={runModelNames}
            onModelChange={(newId) =>
              setFullscreen({ modelId: newId, variant: fullscreen.variant })
            }
            isFullscreen
            onCloseFullscreen={() => setFullscreen(null)}
          />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white hidden sm:block">AI UI Benchmark</h1>
          </div>

          {/* Run Selector */}
          <RunSelector
            runs={runs}
            currentRunId={currentRunId}
            onSelect={setCurrentRunId}
            onDelete={handleDeleteRun}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* New Benchmark Button */}
          <button
            onClick={() => setGenerateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Benchmark</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500 text-sm">Loading runs…</p>
            </div>
          </div>
        ) : runs.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-[calc(100vh-60px)]">
            <div className="max-w-lg text-center space-y-6 px-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  No benchmarks yet
                </h2>
                <p className="text-gray-400">
                  Run your first benchmark to compare how different AI models generate frontend UIs from the same prompt.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setGenerateOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Your First Benchmark
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Configure API Key
                </button>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-sm font-medium text-white mb-1">Multi-Model</h3>
                  <p className="text-xs text-gray-500">Test Claude, GPT, Gemini — all through OpenRouter</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-sm font-medium text-white mb-1">5 Variants</h3>
                  <p className="text-xs text-gray-500">Temperature variation for diverse designs</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-sm font-medium text-white mb-1">Live Preview</h3>
                  <p className="text-xs text-gray-500">Interactive sandboxed iframe rendering</p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-sm font-medium text-white mb-1">Source View</h3>
                  <p className="text-xs text-gray-500">Toggle between preview and code</p>
                </div>
              </div>
            </div>
          </div>
        ) : runLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500 text-sm">Loading run data…</p>
            </div>
          </div>
        ) : currentRun ? (
          <Gallery run={currentRun} onFullscreen={handleFullscreen} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Select a run to view designs</p>
          </div>
        )}
      </main>

      {/* Modals / Panels */}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GeneratePanel
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onComplete={handleGenerateComplete}
      />

      {/* Fullscreen overlay */}
      {renderFullscreen()}
    </div>
  );
}
