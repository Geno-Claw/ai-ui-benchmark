# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI UI Benchmark — a fully client-side tool for comparing how different AI models generate UIs from the same prompts. Each model generates 5 unique design variants per prompt, viewable side-by-side with live preview, source code, and metadata. Supports "raw" (prompt only) and "skill-augmented" (prompt + design skill context) test modes. Deployed as a static site to GitHub Pages.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Static production build (outputs to out/)
npm run lint     # ESLint via Next.js
```

No test framework is configured. No `.env` files needed. No server needed — the OpenRouter API key is stored in browser localStorage and sent directly to OpenRouter.

## Tech Stack

- **Next.js 15** (App Router, static export via `output: "export"`) + **React 19** + **TypeScript 5.7** (strict mode)
- **Tailwind CSS v4** with dark theme (`class` strategy, gray-950 base, blue-600 accent)
- **No external UI library** — pure Tailwind + inline SVGs, no shadcn/Radix/MUI
- **No external state management** — React hooks only (useState/useEffect in page.tsx)
- **No server** — plain `fetch()` calls OpenRouter directly from the browser
- **IndexedDB** — all run data stored client-side via `idb` library

## Architecture

### Data Flow

```
Browser (page.tsx orchestrates state)
  → useBackgroundGeneration hook
    → runBenchmark() (src/runner/generate.ts)
      → callOpenRouter() (src/runner/openrouter.ts)
        → OpenRouter API (direct browser fetch)
    → IndexedDB (src/lib/db.ts)
```

There are **no API routes** and **no server-side code**. Everything runs in the browser.

### Key Directories

- `src/app/page.tsx` — Main app shell and top-level state orchestrator
- `src/hooks/useBackgroundGeneration.ts` — Generation lifecycle: start, progress, resume, cancel
- `src/runner/` — `generate.ts` (orchestration with callbacks), `openrouter.ts` (API client)
- `src/components/` — React components (Gallery, ComparisonSlot, VariantCarousel, ModelPicker, SourceView, GeneratePanel, Settings, RunSelector)
- `src/lib/` — `types.ts` (interfaces), `config.ts` (model configs), `db.ts` (IndexedDB), `prompts.ts` (static prompt bank), `skill-text.ts` (bundled skill)
- `prompts/` — Curated prompt bank (JSON files, imported at build time by `src/lib/prompts.ts`)
- `docs/` — PROJECT_SPEC.md (comprehensive spec), RESEARCH.md, ADRs, frontend-design skill reference

### Component Hierarchy

```
page.tsx (state orchestrator)
├── RunSelector (dropdown with run list, delete)
├── Gallery (2-column grid)
│   └── ComparisonSlot (per model)
│       ├── ModelPicker (pill buttons to swap model)
│       ├── VariantCarousel (navigate 5 variants)
│       ├── iframe (live preview, sandboxed)
│       └── SourceView (syntax-highlighted code)
├── Settings (slide-over, API key management via localStorage)
└── GeneratePanel (modal, prompt/model/mode selection, progress)
```

### State Management

Top-level state lives in `page.tsx`: runs list, currentRunId, currentRun, modal visibility. Component-local state handles variant selection, zoom, source toggle. API key stored in localStorage under `"openrouter-api-key"`.

### Generation Pipeline

The `useBackgroundGeneration` hook calls `runBenchmark()` directly with `onInit` and `onProgress` callbacks. Models run in parallel via `Promise.all`; within each model, 5 variants run sequentially to avoid rate limits. Temperature varies per variant: `[0.7, 0.8, 0.9, 1.0, 1.1]`. Each variant prompt includes an explicit differentiation instruction. Results are saved incrementally to IndexedDB — interrupted runs can be resumed. Run IDs follow the pattern `YYYY-MM-DD-<prompt-slug>-<mode>-<timestamp>`.

## Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Dark theme by default:** `<html class="dark">` set in layout.tsx
- **Sandboxed iframes:** Generated HTML rendered with `<iframe sandbox="allow-scripts" srcDoc={html}>`
- **No database/server:** All persistence is IndexedDB in the browser
- **Static prompts:** Prompt bank is bundled at build time from `prompts/*.json` into `src/lib/prompts.ts`
- **Inter font** loaded via `next/font/google`
- **ADRs** in `docs/adr/` document key architectural decisions
- **GitHub Pages deployment:** Static build via `output: "export"`, deployed with GitHub Actions. `basePath: "/ai-ui-benchmark"` set for production.

## Models

Defined in `src/lib/config.ts`. Default models via OpenRouter:
- Claude Opus 4.6 (`anthropic/claude-opus-4-6`)
- Claude Sonnet 4.5 (`anthropic/claude-sonnet-4-5`)
- GPT-5.2 (`openai/gpt-5.2`)
- Gemini 2.5 Pro (`google/gemini-2.5-pro-preview-06-05`)
