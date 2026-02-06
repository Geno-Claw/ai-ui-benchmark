import { ModelConfig } from "./types";

export const DEFAULT_MODELS: ModelConfig[] = [
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
  {
    id: "gpt-5-2",
    openRouterId: "openai/gpt-5.2",
    name: "GPT-5.2",
  },
  {
    id: "gemini-2-5-pro",
    openRouterId: "google/gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro",
  },
];

export const VARIANT_TEMPERATURES = [0.7, 0.8, 0.9, 1.0, 1.1];
