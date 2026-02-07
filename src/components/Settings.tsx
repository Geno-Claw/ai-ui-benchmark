"use client";

import { useState, useEffect } from "react";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Settings panel for managing OpenRouter API key. */
export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("openrouter-api-key") || "");
      const hasKey = !!localStorage.getItem("openrouter-api-key");
      setTestStatus(hasKey ? "idle" : "idle");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openrouter-api-key", apiKey.trim());
      setTestStatus("idle");
    }
  };

  const handleClear = () => {
    localStorage.removeItem("openrouter-api-key");
    setApiKey("");
    setTestStatus("idle");
    setTestError(null);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;

    // Save first
    localStorage.setItem("openrouter-api-key", apiKey.trim());
    setTestStatus("testing");
    setTestError(null);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "X-Title": "AI UI Benchmark",
        },
      });
      if (res.ok) {
        setTestStatus("valid");
      } else {
        const errorBody = await res.text();
        setTestStatus("invalid");
        setTestError(`API returned ${res.status}: ${errorBody.slice(0, 200)}`);
      }
    } catch (err) {
      setTestStatus("invalid");
      setTestError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 backdrop-blur-xl bg-[#0a0a1a]/90 border-l border-white/[0.08] shadow-2xl overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-sora)]">Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* API Key Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                OpenRouter API Key
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Your key is stored only in this browser&apos;s localStorage. It&apos;s never saved to disk or sent anywhere except OpenRouter.
              </p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestStatus("idle");
                  }}
                  placeholder="sk-or-v1-..."
                  className="w-full backdrop-blur-sm bg-white/[0.04] text-gray-200 rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 pr-20"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-all"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Status indicator */}
            {testStatus !== "idle" && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg backdrop-blur-sm border ${
                testStatus === "testing"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : testStatus === "valid"
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {testStatus === "testing" && (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing connection...
                  </>
                )}
                {testStatus === "valid" && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected -- API key is valid
                  </>
                )}
                {testStatus === "invalid" && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {testError || "Invalid API key"}
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!apiKey.trim() || testStatus === "testing"}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/20"
              >
                Test Connection
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm bg-white/[0.06] border border-white/[0.08] text-gray-200 hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm bg-white/[0.04] border border-white/[0.06] text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">About API Keys</h3>
            <ul className="text-xs text-gray-500 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">+</span>
                Stored only in your browser&apos;s localStorage
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">+</span>
                Sent directly to OpenRouter from your browser
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">+</span>
                Never saved to disk or logged server-side
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">+</span>
                One key gives access to all supported models
              </li>
            </ul>
            <p className="text-xs text-gray-600">
              Get your key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
