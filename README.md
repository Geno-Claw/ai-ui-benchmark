# AI UI Benchmark 🎨🤖

Compare how different AI models generate UIs from the same prompts.

## Concept

Give multiple AI models the same UI design prompt and compare the results side-by-side. Each model generates **5 unique designs per prompt**, and you can easily swap between all designs to compare quality, creativity, and code correctness.

## Test Modes

### 1. Raw Prompt Test
Each model receives the same natural language prompt and generates a complete UI component/page. Tests the model's inherent UI design and coding ability.

### 2. Skill-Augmented Test
Each model receives the same prompt **plus** the claude-code/front-end design skill context. Tests how well models leverage structured design guidance.

## Models Under Test

- Claude Opus 4.6
- Claude Sonnet 4.5
- GPT-5.2
- Gemini 2.5 Pro
- *(more to be added)*

## Delivery Requirements

- **5 designs per model per prompt** — each generation is a unique attempt
- **Side-by-side comparison UI** — easily swap between all designs
- **Live preview** — render each design in an iframe or similar
- **Metadata tracking** — model, prompt, generation time, token usage
- **Scoring/rating system** — manual rating for each design

## Tech Stack

TBD — likely Next.js or similar for the comparison UI, with a CLI runner for batch generation.

## Project Board

[AI UI Benchmark Project](https://github.com/users/Geno-Claw/projects/2)

## Status

🚧 **Early planning** — initial repo setup
