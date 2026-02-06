import { ModelConfig, ReasoningEffort } from "./types";

/** Reasoning effort presets per provider */
const OPENAI_EFFORTS: ReasoningEffort[] = ["none", "minimal", "low", "medium", "high", "xhigh"];
const ANTHROPIC_EFFORTS: ReasoningEffort[] = ["none", "on"];
const GEMINI_3_EFFORTS: ReasoningEffort[] = ["none", "minimal", "low", "medium", "high"];
const GEMINI_25_EFFORTS: ReasoningEffort[] = ["none", "low", "medium", "high"];
const TOGGLE_EFFORTS: ReasoningEffort[] = ["none", "on"];

export const DEFAULT_MODELS: ModelConfig[] = [
  // Anthropic
  {
    id: "claude-opus-4-6",
    openRouterId: "anthropic/claude-opus-4-6",
    name: "Claude Opus 4.6",
    reasoningEfforts: ANTHROPIC_EFFORTS,
    reasoningMode: "toggle",
  },
  {
    id: "claude-sonnet-4-5",
    openRouterId: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    reasoningEfforts: ANTHROPIC_EFFORTS,
    reasoningMode: "toggle",
  },
  // OpenAI
  {
    id: "gpt-5-2",
    openRouterId: "openai/gpt-5.2",
    name: "GPT-5.2",
    reasoningEfforts: OPENAI_EFFORTS,
    reasoningMode: "effort",
  },
  {
    id: "gpt-5-2-pro",
    openRouterId: "openai/gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    reasoningEfforts: OPENAI_EFFORTS,
    reasoningMode: "effort",
  },
  {
    id: "gpt-5-2-codex",
    openRouterId: "openai/gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    reasoningEfforts: OPENAI_EFFORTS,
    reasoningMode: "effort",
  },
  // Google
  {
    id: "gemini-3-pro",
    openRouterId: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    reasoningEfforts: GEMINI_3_EFFORTS,
    reasoningMode: "effort",
  },
  {
    id: "gemini-2-5-pro",
    openRouterId: "google/gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro",
    reasoningEfforts: GEMINI_25_EFFORTS,
    reasoningMode: "effort",
  },
  {
    id: "gemini-2-5-flash",
    openRouterId: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    reasoningEfforts: TOGGLE_EFFORTS,
    reasoningMode: "toggle",
  },
  {
    id: "gemini-3-flash",
    openRouterId: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    reasoningEfforts: GEMINI_3_EFFORTS,
    reasoningMode: "effort",
  },
  // DeepSeek
  {
    id: "deepseek-v3-2",
    openRouterId: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    reasoningEfforts: TOGGLE_EFFORTS,
    reasoningMode: "toggle",
  },
  // Qwen
  {
    id: "qwen3-coder",
    openRouterId: "qwen/qwen3-coder-next",
    name: "Qwen3 Coder",
  },
  // Moonshot AI
  {
    id: "kimi-k2-5",
    openRouterId: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    reasoningEfforts: TOGGLE_EFFORTS,
    reasoningMode: "toggle",
  },
  // Z-AI
  {
    id: "glm-4-7",
    openRouterId: "z-ai/glm-4.7",
    name: "GLM 4.7",
    reasoningEfforts: TOGGLE_EFFORTS,
    reasoningMode: "toggle",
  },
  // MiniMax
  {
    id: "minimax-m2-1",
    openRouterId: "minimax/minimax-m2.1",
    name: "MiniMax M2.1",
    reasoningEfforts: TOGGLE_EFFORTS,
    reasoningMode: "toggle",
  },
];

/** Group models by provider for UI display */
export function getModelGroups(): { label: string; models: ModelConfig[] }[] {
  const groups: { label: string; ids: string[] }[] = [
    { label: "Anthropic", ids: ["claude-opus-4-6", "claude-sonnet-4-5"] },
    { label: "OpenAI", ids: ["gpt-5-2", "gpt-5-2-pro", "gpt-5-2-codex"] },
    { label: "Google", ids: ["gemini-3-pro", "gemini-2-5-pro", "gemini-2-5-flash", "gemini-3-flash"] },
    { label: "Others", ids: ["deepseek-v3-2", "qwen3-coder", "kimi-k2-5", "glm-4-7", "minimax-m2-1"] },
  ];

  return groups.map((g) => ({
    label: g.label,
    models: g.ids
      .map((id) => DEFAULT_MODELS.find((m) => m.id === id))
      .filter((m): m is ModelConfig => m !== undefined),
  }));
}

export const VARIANT_TEMPERATURES = [0.7, 0.8, 0.9, 1.0, 1.1];
