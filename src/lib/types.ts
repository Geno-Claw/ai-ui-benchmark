export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ModelConfig {
  id: string;
  openRouterId: string;
  name: string;
  /** Available reasoning effort levels for this model (empty/undefined = no reasoning support) */
  reasoningEfforts?: ReasoningEffort[];
}

export interface GenerateOptions {
  model: ModelConfig;
  variant: number;
  mode: "raw" | "skill";
  temperature?: number;
  apiKey: string;
  signal?: AbortSignal;
  reasoningEffort?: ReasoningEffort;
}

export interface GenerationResult {
  html: string;
  tokens: { input: number; output: number };
  durationMs: number;
  model: string;
  cost?: number;
  error?: string;
}

export interface RunSummary {
  id: string;
  prompt: string;
  promptTitle: string;
  models: string[];
  mode: "raw" | "skill";
  date: string;
  totalVariants: number;
}

export interface Run extends RunSummary {
  designs: Record<string, GenerationResult[]>;
}

export interface PromptConfig {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
}

export interface AppState {
  currentRunId: string | null;
  layoutMode: "gallery" | "sideBySide" | "fullscreen";
  slots: Array<{ model: string; variant: number }>;
  runs: RunSummary[];
  currentRun: Run | null;
}
