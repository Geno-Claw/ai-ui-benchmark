import { ModelConfig } from "./types";

export const DEFAULT_MODELS: ModelConfig[] = [
  // Anthropic
  {
    id: "claude-opus-4-6",
    openRouterId: "anthropic/claude-opus-4-6",
    name: "Claude Opus 4.6",
  },
  {
    id: "claude-sonnet-4-5",
    openRouterId: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
  },
  // OpenAI
  {
    id: "gpt-5-2",
    openRouterId: "openai/gpt-5.2",
    name: "GPT-5.2",
    supportsReasoning: true,
  },
  {
    id: "gpt-5-2-pro",
    openRouterId: "openai/gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    supportsReasoning: true,
  },
  {
    id: "gpt-5-2-codex",
    openRouterId: "openai/gpt-5.2-codex",
    name: "GPT-5.2 Codex",
    supportsReasoning: true,
  },
  // Google
  {
    id: "gemini-2-5-pro",
    openRouterId: "google/gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro",
  },
  {
    id: "gemini-2-5-flash",
    openRouterId: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
  },
  {
    id: "gemini-3-flash",
    openRouterId: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
  },
  // DeepSeek
  {
    id: "deepseek-v3-2",
    openRouterId: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
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
  },
  // Z-AI
  {
    id: "glm-4-7",
    openRouterId: "z-ai/glm-4.7",
    name: "GLM 4.7",
  },
  // MiniMax
  {
    id: "minimax-m2-1",
    openRouterId: "minimax/minimax-m2.1",
    name: "MiniMax M2.1",
  },
];

/** Group models by provider for UI display */
export function getModelGroups(): { label: string; models: ModelConfig[] }[] {
  const groups: { label: string; ids: string[] }[] = [
    { label: "Anthropic", ids: ["claude-opus-4-6", "claude-sonnet-4-5"] },
    { label: "OpenAI", ids: ["gpt-5-2", "gpt-5-2-pro", "gpt-5-2-codex"] },
    { label: "Google", ids: ["gemini-2-5-pro", "gemini-2-5-flash", "gemini-3-flash"] },
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
