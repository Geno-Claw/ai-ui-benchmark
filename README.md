# AI UI Benchmark

Compare how different AI models generate frontend UIs from the same prompt. Run a prompt against multiple models, get 5 unique designs from each, and browse them in a side-by-side comparison gallery.

## Features

- **Multi-model generation** via OpenRouter — one API key, all models
- **5 unique variants per model** with temperature variation
- **Live iframe preview** with 50% / 75% / 100% zoom controls
- **Side-by-side comparison** — swap models into any slot
- **Source code viewer** with syntax highlighting and line numbers
- **Raw vs skill-augmented modes** — test with or without prompt engineering
- **Prompt bank** with curated prompts across categories
- **Archive system** with client-side search and filter
- **Settings panel** with API key management and connection testing

## Quick Start

```bash
git clone https://github.com/Geno-Claw/ai-ui-benchmark.git
cd ai-ui-benchmark
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your OpenRouter API key in Settings, and run your first benchmark.

## Prerequisites

- Node.js 22+
- npm
- An OpenRouter API key — [get one here](https://openrouter.ai)

## Configuration

No `.env` files needed. The API key is entered in the Settings panel and stored in browser `localStorage` — it's never persisted server-side.

Supported models are configured in [`src/lib/config.ts`](src/lib/config.ts). The defaults are:

| Model | OpenRouter ID |
|---|---|
| Claude Opus 4.6 | `anthropic/claude-opus-4-6` |
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` |
| GPT-5.2 | `openai/gpt-5.2` |
| Gemini 2.5 Pro | `google/gemini-2.5-pro-preview-06-05` |

## Project Structure

```
src/app/          — Next.js pages and API routes
src/components/   — React UI components
src/runner/       — Generation engine (OpenRouter client, archiver)
src/lib/          — Shared types and config
prompts/          — Curated prompt bank (JSON files)
archive/          — Generated outputs (gitignored)
docs/             — Project spec and ADRs
```

## Adding Models

Edit `src/lib/config.ts` and add the model's OpenRouter ID to the `DEFAULT_MODELS` array. No other code changes needed.

## Adding Prompts

Create a JSON file in `prompts/` with this schema:

```json
{
  "id": "my-prompt",
  "title": "My Prompt",
  "category": "Landing Pages",
  "description": "A brief description of the UI to generate.",
  "prompt": "The full prompt text sent to models..."
}
```

The prompt will appear in the Generate panel automatically.

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Lint check
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI API | OpenRouter |

## Project Board

[AI UI Benchmark — GitHub Project](https://github.com/users/Geno-Claw/projects/2)

## License

MIT
