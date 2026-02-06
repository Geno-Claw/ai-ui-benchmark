import { promises as fs } from "fs";
import path from "path";

export interface PromptDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
}

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

/**
 * Load a prompt from the prompt bank by ID.
 */
export async function loadPrompt(id: string): Promise<PromptDefinition> {
  const filePath = path.join(PROMPTS_DIR, `${id}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as PromptDefinition;
}

/**
 * List all available prompts from the prompt bank.
 */
export async function listPrompts(): Promise<PromptDefinition[]> {
  const files = await fs.readdir(PROMPTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const prompts: PromptDefinition[] = [];
  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(PROMPTS_DIR, file), "utf-8");
    prompts.push(JSON.parse(content) as PromptDefinition);
  }

  return prompts;
}

/**
 * Create a prompt definition from inline text.
 */
export function inlinePrompt(text: string): PromptDefinition {
  return {
    id: "custom",
    title: "Custom Prompt",
    category: "Custom",
    description: "User-provided ad-hoc prompt",
    prompt: text,
  };
}
