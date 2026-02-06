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

## Planned

### Core
- [ ] Prompt runner — send same prompt to multiple models via OpenRouter API
- [ ] Design gallery — side-by-side comparison UI with easy swapping
- [ ] Live preview — render generated HTML/CSS/JS in sandboxed iframes
- [ ] 5 unique designs per model per prompt (temperature variation)
- [ ] Metadata tracking (model, tokens, generation time, cost)

### Test Modes
- [ ] Raw prompt mode — plain natural language prompt
- [ ] Skill-augmented mode — prompt + frontend-design skill context

### UI Features
- [ ] Gallery grid layout mode
- [ ] Side-by-side comparison (2-4 slots)
- [ ] Full-screen single preview
- [ ] Source code toggle with syntax highlighting
- [ ] Model switching in comparison slots
- [ ] Variant carousel navigation
- [ ] Settings page with API key management (localStorage)

### Archive & Retrieval
- [ ] Save runs to archive (prompt, model, outputs, metadata)
- [ ] Browse/search archived runs
- [ ] Re-open archived designs for comparison
- [ ] Delete archived runs

### Models (via OpenRouter)
- [ ] Claude Opus 4.6
- [ ] Claude Sonnet 4.5
- [ ] GPT-5.2
- [ ] Gemini 2.5 Pro
- [ ] Any additional OpenRouter-supported models
