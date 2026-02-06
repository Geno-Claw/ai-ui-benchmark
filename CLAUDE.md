# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI UI Benchmark — a tool for comparing how different AI models generate UIs from the same prompts. Each model generates 5 unique design variants per prompt, viewable side-by-side with live preview, source code, and metadata. Supports "raw" (prompt only) and "skill-augmented" (prompt + design skill context) test modes.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint via Next.js
```

No test framework is configured. No `.env` files needed — the OpenRouter API key is stored in browser localStorage.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5.7** (strict mode)
- **Tailwind CSS v4** with dark theme (`class` strategy, gray-950 base, blue-600 accent)
- **No external UI library** — pure Tailwind + inline SVGs, no shadcn/Radix/MUI
- **No external state management** — React hooks only (useState/useEffect in page.tsx)
- **No external HTTP SDK** — plain `fetch()` for OpenRouter API calls
- **File-based storage** — runs archived as JSON + HTML in `archive/` (gitignored)

## Architecture

### Data Flow

```
Browser (page.tsx orchestrates state)
  → API Routes (src/app/api/)
    → Runner modules (src/runner/)
      → OpenRouter API (external)
      → Archive (file system: archive/)
```

### Key Directories

- `src/app/page.tsx` — Main app shell and top-level state orchestrator
- `src/app/api/` — 5 API routes: generate, runs (list/get/delete), prompts, test-key
- `src/runner/` — Backend logic: `generate.ts` (orchestration), `openrouter.ts` (API client), `prompt-loader.ts`, `archiver.ts`
- `src/components/` — 7 React components (Gallery, ComparisonSlot, VariantCarousel, ModelPicker, SourceView, GeneratePanel, Settings, RunSelector)
- `src/lib/` — `types.ts` (all domain interfaces) and `config.ts` (model configs, temperatures)
- `prompts/` — Curated prompt bank (JSON files, one per prompt)
- `archive/` — Generated run data (gitignored), structured as `<run-id>/<model-slug>/variant-<n>.html`
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

Top-level state lives in `page.tsx`: runs list, currentRunId, currentRun, modal visibility. Component-local state handles variant selection, zoom, source toggle. API key stored in localStorage under `"openrouter-api-key"`, passed to API routes via `x-openrouter-key` header.

### Generation Pipeline

Models run in parallel via `Promise.all`; within each model, 5 variants run sequentially to avoid rate limits. Temperature varies per variant: `[0.7, 0.8, 0.9, 1.0, 1.1]`. Each variant prompt includes an explicit differentiation instruction. Run IDs follow the pattern `YYYY-MM-DD-<prompt-slug>-<mode>[-<n>]`.

## Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Dark theme by default:** `<html class="dark">` set in layout.tsx
- **Sandboxed iframes:** Generated HTML rendered with `<iframe sandbox="allow-scripts" srcDoc={html}>`
- **No database:** All persistence is file-based in the `archive/` directory
- **Inter font** loaded via `next/font/google`
- **ADRs** in `docs/adr/` document key architectural decisions (OpenRouter as provider, localStorage for keys, plain fetch, gallery component hierarchy)

## Models

Defined in `src/lib/config.ts`. Default 4 models via OpenRouter:
- Claude Opus 4.6 (`anthropic/claude-opus-4-6`)
- Claude Sonnet 4.5 (`anthropic/claude-sonnet-4-5`)
- GPT-5.2 (`openai/gpt-5.2`)
- Gemini 2.5 Pro (`google/gemini-2.5-pro-preview-06-05`)
