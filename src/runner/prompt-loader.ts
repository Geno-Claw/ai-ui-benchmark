import { promises as fs } from "fs";
import path from "path";
import { PromptConfig } from "@/lib/types";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

/**
 * Load a prompt from the prompt bank by ID.
 * Returns null if the prompt doesn't exist.
 */
export async function loadPrompt(id: string): Promise<PromptConfig | null> {
  try {
    const filePath = path.join(PROMPTS_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as PromptConfig;
  } catch {
    return null;
  }
}

/**
 * List all available prompts from the prompt bank.
 */
export async function listPrompts(): Promise<PromptConfig[]> {
  try {
    const files = await fs.readdir(PROMPTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const prompts: PromptConfig[] = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(PROMPTS_DIR, file), "utf-8");
      prompts.push(JSON.parse(content) as PromptConfig);
    }

    return prompts;
  } catch {
    return [];
  }
}

/**
 * Create a prompt config from inline text.
 */
export function inlinePrompt(text: string): PromptConfig {
  return {
    id: "custom",
    title: "Custom Prompt",
    category: "Custom",
    description: "User-provided ad-hoc prompt",
    prompt: text,
  };
}
