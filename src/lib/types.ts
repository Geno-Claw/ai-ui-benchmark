export interface ModelConfig {
  id: string;
  openRouterId: string;
  name: string;
}

export interface GenerateOptions {
  model: ModelConfig;
  variant: number;
  mode: "raw" | "skill";
  temperature?: number;
  apiKey: string;
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

export interface AppState {
  currentRunId: string | null;
  layoutMode: "gallery" | "sideBySide" | "fullscreen";
  slots: Array<{ model: string; variant: number }>;
  runs: RunSummary[];
  currentRun: Run | null;
}
