# Features

## Implemented

### Project Scaffolding (v0.1.0)
- [x] Next.js 15 + React 19 + TypeScript project setup
- [x] Tailwind CSS v4 with dark theme by default
- [x] App Router with `src/` directory structure
- [x] TypeScript types for all core domain models (ModelConfig, Run, AppState, etc.)
- [x] Default model configuration (Claude Opus 4.6, Claude Sonnet 4.5, GPT-5.2, Gemini 2.5 Pro)
- [x] Landing page with feature overview
- [x] Component scaffolding: Gallery, ComparisonSlot, VariantCarousel, SourceView, RunSelector, ModelPicker
- [x] Runner module stubs: generate, openrouter, prompt-loader, archiver
- [x] API route stubs: `/api/runs` (list), `/api/generate` (trigger)
- [x] Prompt bank with sample SaaS Landing Page prompt
- [x] Archive directory structure with .gitkeep
- [x] ADR documentation for architecture decisions

### Prompt Runner & OpenRouter Integration (v0.2.0)
- [x] OpenRouter client using plain `fetch()` — no external SDK dependencies
- [x] POST to `https://openrouter.ai/api/v1/chat/completions` with proper auth headers
- [x] Retry logic: up to 2 retries with exponential backoff on failure
- [x] Token usage tracking (prompt_tokens, completion_tokens) from API response
- [x] Generation duration tracking via `Date.now()` timestamps
- [x] Generation engine orchestrating parallel model runs with sequential variant generation
- [x] 5 variants per model with temperature variation: [0.7, 0.8, 0.9, 1.0, 1.1]
- [x] Explicit variant differentiation instruction appended to every prompt
- [x] Raw mode: send prompt directly to models
- [x] Skill mode: prepend frontend-design skill text before the prompt
- [x] Unique run ID generation: `YYYY-MM-DD-<prompt-slug>-<mode>[-<n>]` with deduplication
- [x] Progress callback support for real-time status updates

### Archive System (v0.2.0)
- [x] File-based archive: `archive/<run-id>/<model-slug>/variant-<n>.html`
- [x] `meta.json` per run with generation metadata (tokens, duration, cost, errors)
- [x] `archive/index.json` — central index of all run summaries
- [x] `saveRun` — archive full run with HTML files and metadata
- [x] `loadIndex` — list all archived runs
- [x] `loadRun` — reconstruct full run with HTML content from archive
- [x] `deleteRun` — remove run directory and update index

### Prompt Bank (v0.2.0)
- [x] File-based prompt storage: `prompts/<id>.json`
- [x] `loadPrompt` — load a single prompt by ID
- [x] `listPrompts` — list all available prompts
- [x] Inline prompt support for ad-hoc custom prompts
- [x] 4 curated prompts: SaaS Landing Page, Analytics Dashboard, Multi-Step Signup Form, Creative Portfolio

### API Routes (v0.2.0)
- [x] `POST /api/generate` — trigger a benchmark run (API key via header, prompt + models + mode in body)
- [x] `GET /api/runs` — list all archived runs from index
- [x] `GET /api/runs/[runId]` — get full run data with HTML content
- [x] `DELETE /api/runs/[runId]` — delete an archived run
- [x] `POST /api/test-key` — validate an OpenRouter API key
- [x] `GET /api/prompts` — list all available prompts from the prompt bank

### Design Gallery UI (v0.3.0)
- [x] **Main Page** — full app shell with top bar, run selector, settings, and generate button
- [x] **Empty state** — welcoming CTA when no benchmark runs exist
- [x] **Gallery view** — 2-column grid of ComparisonSlots, one per model in the run
- [x] **Live preview** — sandboxed iframes rendering generated HTML (`<iframe sandbox="allow-scripts" srcDoc={html}>`)
- [x] **Source code view** — toggle between preview and syntax-highlighted code with line numbers
- [x] **Copy to clipboard** — one-click copy of generated HTML source
- [x] **Model swapping** — pill button group to swap which model displays in any comparison slot
- [x] **Variant carousel** — tab strip with arrow navigation to cycle through 5 variants per model
- [x] **Zoom controls** — 50%, 75%, 100% scaling for iframe previews
- [x] **Fullscreen mode** — expand any slot to a fullscreen overlay with all controls intact
- [x] **Metadata display** — generation time, token count, and cost for each design
- [x] **Run selector** — dropdown with run list showing date, prompt title, mode, and model count
- [x] **Delete runs** — inline delete with click-to-confirm safety
- [x] **Settings panel** — slide-over for OpenRouter API key management
  - [x] Show/hide toggle for key
  - [x] Test Connection button (calls `/api/test-key`)
  - [x] Save to / Clear from localStorage
  - [x] Connection status indicator (testing, valid, invalid)
- [x] **Generate panel** — modal for starting new benchmark runs
  - [x] Prompt selector: curated prompts from bank + custom text input
  - [x] Model checkboxes with select-all
  - [x] Mode toggle: Raw vs Skill-Augmented
  - [x] Progress indicator during generation
  - [x] Auto-select new run on completion
- [x] **Inter font** via `next/font/google`
- [x] **Dark theme** — gray-950 backgrounds, blue-600 accents, consistent design
- [x] **Responsive** — desktop-first with tablet-friendly layout
- [x] **No external UI library** — pure Tailwind CSS + inline SVG icons

## Planned

### Future Enhancements
- [ ] Side-by-side layout mode (2-4 fixed slots)
- [ ] Client-side search/filter over archived runs
- [ ] Responsive preview controls (mobile/tablet/desktop viewport widths)
- [ ] Export run as zip download
- [ ] URL-based deep linking to specific run/model/variant
- [ ] Real-time progress via SSE during generation
- [ ] Additional model support as available on OpenRouter
