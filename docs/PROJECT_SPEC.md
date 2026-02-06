# AI UI Benchmark — Project Specification

## Vision

A personal developer tool to evaluate and compare how different AI models generate frontend UIs from the same prompts. Run a prompt against multiple models, get 5 unique designs from each, and browse them all in a slick comparison interface. Optionally test with Anthropic's frontend-design skill injected to measure the impact of prompt engineering on output quality.

---

## User Stories

### Generation

**US-1: Run a benchmark**
> As a developer, I want to select a prompt and a set of models, then generate 5 unique UI designs from each model, so I can compare their output quality.

**US-2: Choose test mode**
> As a developer, I want to run the same prompt in both "raw" and "skill-augmented" modes, so I can see how much the frontend-design skill improves each model's output.

**US-3: Use curated prompts**
> As a developer, I want to pick from a bank of curated UI prompts organized by category (landing pages, dashboards, forms, etc.), so I have consistent, well-crafted test cases.

**US-4: Use custom prompts**
> As a developer, I want to type in my own ad-hoc prompt and run it against models, so I can test whatever UI idea I have in mind.

**US-5: Track generation metadata**
> As a developer, I want each generation to record the model used, token count, generation time, and cost estimate, so I can factor in efficiency alongside design quality.

### Viewing & Comparison

**US-6: Browse designs in a gallery**
> As a developer, I want to see all generated designs from a run in a gallery view, so I can quickly scan the output from every model.

**US-7: Live preview**
> As a developer, I want each design rendered as a live, interactive preview (not a screenshot), so I can see animations, hover states, and responsive behavior.

**US-8: Swap between models**
> As a developer, I want to quickly swap which model's output is displayed in a comparison slot, so I can do rapid A/B comparisons.

**US-9: Cycle through variants**
> As a developer, I want to flip through the 5 design variants from a single model, so I can see the range of output a model produces from the same prompt.

**US-10: View source code**
> As a developer, I want to toggle between the live preview and the raw generated code (HTML/CSS/JS), so I can evaluate code quality alongside visual quality.

**US-11: Side-by-side comparison**
> As a developer, I want to view 2 or more designs side-by-side simultaneously, so I can directly compare models against each other.

**US-12: Full-screen preview**
> As a developer, I want to expand any single design to full-screen/full-width, so I can see it as it would appear in a real browser.

### Archive & Retrieval

**US-13: Auto-archive runs**
> As a developer, I want each benchmark run to be automatically saved with all outputs and metadata, so I never lose results.

**US-14: Browse past runs**
> As a developer, I want to browse a list of all archived runs with summary info (date, prompt, models, mode), so I can find and revisit previous benchmarks.

**US-15: Search archive**
> As a developer, I want to search/filter archived runs by prompt text, model, date, or mode, so I can quickly find specific past results.

**US-16: Delete archived runs**
> As a developer, I want to delete archived runs I no longer need, so I can manage storage.

---

## Feature Requirements

### 1. Prompt Runner (CLI)

| Requirement | Detail |
|---|---|
| **Command** | `npm run generate -- --prompt <id\|text> --models <list> --mode <raw\|skill>` |
| **Models** | Claude Opus 4.6, Claude Sonnet 4.5, GPT-5.2, Gemini 2.5 Pro (extensible) |
| **Variants** | 5 unique designs per model per prompt |
| **Variance method** | Vary temperature and/or include explicit "make this unique" instruction per variant |
| **Raw mode** | Send the prompt directly to each model |
| **Skill mode** | Prepend the frontend-design skill text to the prompt |
| **Output format** | Self-contained HTML file (inline CSS/JS, Google Fonts links OK) |
| **Output location** | `archive/<run-id>/<model-slug>/variant-<n>.html` |
| **Metadata** | `meta.json` per run and per model with tokens, time, cost, prompt text |
| **Concurrency** | Parallel requests across models, sequential within variants (to avoid rate limits) |
| **Error handling** | Retry failed generations up to 2x, log failures in metadata |
| **Progress** | CLI progress output showing which model/variant is generating |

### 2. Prompt Bank

| Requirement | Detail |
|---|---|
| **Storage** | `prompts/` directory, one JSON file per prompt |
| **Schema** | `{ id, title, category, description, prompt }` |
| **Categories** | Landing Pages, Dashboards, Forms & Inputs, Components, Full Apps |
| **Initial set** | At least 10 prompts across 3+ categories |
| **Custom prompts** | Support inline text via `--prompt "Build a..."` |
| **Extensibility** | Easy to add new prompts — just drop a JSON file |

### 3. Design Gallery (Web UI)

| Requirement | Detail |
|---|---|
| **Framework** | Next.js + TypeScript + Tailwind CSS |
| **Layout modes** | Gallery grid, side-by-side (2-4 slots), single full-width |
| **Live preview** | Sandboxed iframes rendering the generated HTML |
| **Variant navigation** | Carousel or tab strip to cycle through 5 variants per model |
| **Model switching** | Dropdown or button group to swap models in any comparison slot |
| **Source toggle** | Button to switch between live preview and syntax-highlighted code view |
| **Run selector** | Dropdown/sidebar to pick which archived run to view |
| **Metadata display** | Show model name, variant number, tokens, generation time per design |
| **Responsive** | Desktop-first, functional on tablet |
| **No auth** | Local tool, no login required |

### 4. Archive System

| Requirement | Detail |
|---|---|
| **Storage** | File-based, `archive/` directory |
| **Run ID format** | `YYYY-MM-DD-<prompt-slug>-<mode>[-<n>]` (increment if duplicate) |
| **Index** | `archive/index.json` — array of run summaries |
| **Auto-save** | Runner automatically archives after generation completes |
| **Browse** | UI lists all runs from index with date, prompt preview, models, mode |
| **Search** | Client-side filter/search over archived runs |
| **Delete** | Remove run directory and update index |
| **Export** | Optional: download a run as a zip |

---

## Design Patterns

### Architecture

```
ai-ui-benchmark/
├── src/
│   ├── app/                    # Next.js app (gallery UI)
│   │   ├── page.tsx            # Main gallery/comparison view
│   │   ├── archive/            # Archive browser page
│   │   └── api/                # API routes for serving archived designs
│   ├── runner/                 # CLI prompt runner
│   │   ├── index.ts            # Entry point
│   │   ├── models/             # Model adapters (anthropic, openai, google)
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── google.ts
│   │   ├── prompt-loader.ts    # Load from bank or inline
│   │   └── archiver.ts         # Save outputs + update index
│   ├── lib/                    # Shared utilities
│   │   ├── types.ts            # TypeScript types/interfaces
│   │   └── config.ts           # Model configs, defaults
│   └── components/             # React components
│       ├── Gallery.tsx          # Grid view of designs
│       ├── ComparisonSlot.tsx   # Single design preview slot
│       ├── VariantCarousel.tsx  # Cycle through 5 variants
│       ├── SourceView.tsx       # Code viewer with syntax highlighting
│       ├── RunSelector.tsx      # Pick archived run
│       └── ModelPicker.tsx      # Swap model in a slot
├── prompts/                    # Curated prompt bank
│   ├── saas-landing.json
│   ├── analytics-dashboard.json
│   └── ...
├── archive/                    # Generated outputs (gitignored)
│   ├── index.json
│   └── <run-id>/
│       ├── meta.json
│       └── <model-slug>/
│           ├── variant-1.html
│           ├── variant-2.html
│           └── ...
├── docs/
│   ├── PROJECT_SPEC.md         # This file
│   ├── RESEARCH.md             # Research notes
│   └── skills/                 # Reference skills
│       └── frontend-design-skill.md
├── FEATURES.md
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

### Model Adapter Pattern

Each model gets an adapter that implements a common interface:

```typescript
interface ModelAdapter {
  id: string;
  name: string;
  generate(prompt: string, options: GenerateOptions): Promise<GenerationResult>;
}

interface GenerateOptions {
  variant: number;        // 1-5
  mode: 'raw' | 'skill';
  temperature?: number;
}

interface GenerationResult {
  html: string;           // The generated HTML/CSS/JS
  tokens: {
    input: number;
    output: number;
  };
  durationMs: number;
  model: string;
  error?: string;
}
```

This makes it trivial to add new models — just implement the adapter.

### Iframe Sandboxing

Live previews use sandboxed iframes to safely render arbitrary generated HTML:

```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  srcDoc={generatedHtml}
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

Key considerations:
- `srcDoc` for inline HTML (no server round-trip)
- `sandbox` attribute restricts dangerous behavior
- Resize observer for responsive preview scaling
- Optional zoom controls (50%, 75%, 100%)

### Variant Differentiation Strategy

To ensure 5 genuinely different designs from the same model:

1. **Temperature variation**: Variants 1-5 use temperatures 0.7, 0.8, 0.9, 1.0, 1.1
2. **Explicit instruction**: Append to prompt: "This is design variant N of 5. Make this design distinct from the others — choose a different aesthetic direction, color palette, typography, and layout approach."
3. **Seed variation**: Where supported by the API (some don't support seeds)

### State Management

Simple client-side state — no database needed:

```typescript
interface AppState {
  // Current view
  currentRunId: string | null;
  layoutMode: 'gallery' | 'sideBySide' | 'fullscreen';
  
  // Comparison slots (for side-by-side)
  slots: Array<{
    model: string;
    variant: number;  // 1-5
  }>;
  
  // Data
  runs: RunSummary[];     // From archive/index.json
  currentRun: Run | null; // Full run data with designs
}
```

### API Routes (Next.js)

```
GET /api/runs                    → List archived runs (from index.json)
GET /api/runs/[runId]            → Get full run data + design metadata
GET /api/runs/[runId]/[model]/[variant]  → Serve the HTML file
DELETE /api/runs/[runId]         → Delete a run
```

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **UI Framework** | Next.js 15 + React 19 | Fast dev, API routes, file serving |
| **Styling** | Tailwind CSS | Rapid UI building, consistent design |
| **Language** | TypeScript | Type safety across runner + UI |
| **Code Highlighting** | Prism.js or Shiki | Syntax highlighting for source view |
| **AI SDKs** | @anthropic-ai/sdk, openai, @google/generative-ai | Official SDKs for each provider |
| **Storage** | File system (JSON + HTML) | Simple, portable, no database needed |
| **Package Manager** | npm | Standard |

---

## Non-Goals (Explicitly Out of Scope)

- ❌ Rating/scoring system
- ❌ User authentication
- ❌ Crowdsourced voting
- ❌ Cloud deployment (local tool)
- ❌ Real-time collaborative features
- ❌ Automated design evaluation (e.g., AI judging AI)
- ❌ Screenshot comparison (we use live previews)

---

## Open Questions

1. **Multi-file output**: Some models (especially with React skills) may want to output multiple files. Do we support this or strictly single-file HTML?
   - **Recommendation**: Start with single-file HTML. Can extend later.

2. **Mobile preview**: Should the gallery show designs at different viewport widths?
   - **Recommendation**: Nice-to-have. Add responsive preview controls (mobile/tablet/desktop width) as a future enhancement.

3. **Cost tracking**: Should we track API costs per run?
   - **Recommendation**: Yes, capture token counts. Calculate estimated cost based on published pricing.

4. **Model versioning**: Models get updated. Should we track exact model version?
   - **Recommendation**: Yes, capture the full model ID returned by the API.
