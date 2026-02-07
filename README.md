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
- **Fully client-side** — runs entirely in the browser, deployed as static files
- **IndexedDB storage** — all run data persists locally in the browser

## Quick Start

```bash
git clone https://github.com/Geno-Claw/ai-ui-benchmark.git
cd ai-ui-benchmark
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your OpenRouter API key in Settings, and run your first benchmark.

## Live Demo

Deployed via GitHub Pages: `https://geno-claw.github.io/ai-ui-benchmark/`

## Prerequisites

- Node.js 20+
- npm
- An OpenRouter API key — [get one here](https://openrouter.ai/keys)

## Configuration

No `.env` files needed. The API key is entered in the Settings panel and stored in browser `localStorage`. It is sent directly to OpenRouter from your browser — no server involved.

Supported models are configured in [`src/lib/config.ts`](src/lib/config.ts).

## Architecture

This is a **fully static client-side app**. There is no server — all code runs in the browser.

```
Browser (page.tsx orchestrates state)
  → Runner modules (src/runner/)
    → OpenRouter API (direct fetch from browser)
  → IndexedDB (run storage, resume tracking)
```

### Project Structure

```
src/app/          — Next.js page and layout
src/components/   — React UI components
src/runner/       — Generation engine (OpenRouter client, benchmark orchestrator)
src/lib/          — Types, config, prompt bank, skill text, IndexedDB client
src/hooks/        — useBackgroundGeneration hook
prompts/          — Curated prompt bank (JSON files, bundled at build time)
docs/             — Project spec and ADRs
```

### Generation Pipeline

Models run in parallel via `Promise.all`; within each model, 5 variants run sequentially to avoid rate limits. Temperature varies per variant: `[0.7, 0.8, 0.9, 1.0, 1.1]`. Each variant prompt includes an explicit differentiation instruction. Results are saved incrementally to IndexedDB — interrupted runs can be resumed.

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

Then add the import to `src/lib/prompts.ts` and rebuild.

## Scripts

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Static production build (outputs to out/)
npm run lint     # Lint check
```

## Deployment

The app is deployed to GitHub Pages via GitHub Actions. On push to `main`, the workflow builds the static site and deploys the `out/` directory.

To deploy your own fork:
1. Enable GitHub Pages in repo settings (source: GitHub Actions)
2. Push to `main`

For custom domains, remove the `basePath` and `assetPrefix` in `next.config.ts`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (static export) |
| UI | React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 4 |
| AI API | OpenRouter (direct browser fetch) |
| Storage | IndexedDB (via idb) |

## Project Board

[AI UI Benchmark — GitHub Project](https://github.com/users/Geno-Claw/projects/2)

## License

MIT
