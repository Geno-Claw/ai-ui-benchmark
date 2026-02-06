# Research Notes

## Key Inspiration: Design Arena (YC S25)
- **URL**: https://www.designarena.ai/
- **What it is**: Crowdsourced benchmark for AI-generated visuals — puts models head-to-head, users vote
- **Methodology**: Bradley-Terry model for pairwise comparisons, Elo-style ratings
- **Tournament format**: 4 models get same prompt → anonymous side-by-side → vote → rankings
- **Key insight**: "What's easiest for humans (like-vs-dislike) is the part AIs can't currently do"
- **Covers**: 54 LLMs, 12 image models, 22 vibe-coding tools (Lovable, Bolt, v0, etc.)
- **Our differentiation**: We're focused on *our own* testing, not crowdsourced. Personal benchmark tool for developers who want to evaluate models for their own use cases. Multiple designs per model per prompt, not just one.

## Key Inspiration: LM Arena (LMSYS Chatbot Arena)
- **URL**: https://lmarena.ai/
- **What it is**: The OG LLM benchmark — anonymous A/B battles, crowdsourced voting
- **Design patterns we can borrow**:
  - Side-by-side comparison layout
  - Anonymous model reveals after voting
  - Elo/Bradley-Terry ranking system
  - Category-based prompt selection

## Anthropic's Frontend Design Skill
- **Source**: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
- **Blog**: https://claude.com/blog/improving-frontend-design-through-skills
- **What it does**: ~400 token prompt that dramatically improves AI-generated UI quality
- **Core problem it solves**: "Distributional convergence" — models default to Inter fonts, purple gradients, white backgrounds
- **Key design axes it addresses**:
  - Typography (avoid generic fonts, use distinctive pairings)
  - Color & Theme (commit to cohesive aesthetic, dominant + accent)
  - Motion (animations, micro-interactions, staggered reveals)
  - Spatial Composition (unexpected layouts, asymmetry, grid-breaking)
  - Backgrounds (atmosphere/depth vs solid colors, gradients, textures)
- **This is exactly what we test**: Raw prompt vs skill-augmented prompt

## Also Relevant: web-artifacts-builder skill
- Guides Claude to use React + Tailwind + shadcn/ui instead of single HTML files
- Bundles via Parcel into single file for preview
- Shows how skills can improve structural quality, not just aesthetics

## Community Insights (Reddit)
- GLM 4.7 and MiniMax 2.1 reportedly generate better designs than Opus + frontend skill
- Multiple users note spatial competency is not an LLM strength
- "Good design isn't just functional — it reflects aesthetic values"
- Custom skills/agents vary widely in effectiveness

## Architecture Patterns for Our Tool

### Generation Pipeline
1. **Prompt Bank**: Curated set of UI prompts (landing pages, dashboards, forms, etc.)
2. **Model Runner**: Send same prompt to N models via API, collect HTML/CSS/JS output
3. **Variant Generation**: 5 unique designs per model per prompt (different seeds/temperature)
4. **Two modes**: Raw prompt vs skill-augmented (inject frontend-design skill)

### Comparison UI
- **Gallery view**: Grid of all designs, filterable by model/prompt/mode
- **Side-by-side**: Pick any 2+ designs to compare
- **Carousel/swipe**: Quick flip through designs for a single model
- **Live preview**: Render in sandboxed iframes
- **Source view**: Toggle to see generated code
- **Model reveal**: Option to hide model names during blind evaluation

### Data Model
```
Prompt
├── id, text, category, difficulty
│
Run
├── id, promptId, mode (raw|skill), timestamp
│
Generation
├── id, runId, model, variant (1-5)
├── html/css/js output
├── metadata (tokens, time, cost)
├── rating (optional manual score)
```

### Rating System Options
- Simple 1-5 stars per design
- Pairwise A/B comparison (like Design Arena)
- Multi-criteria: aesthetics, functionality, creativity, code quality
- ELO-style ranking across models

### Tech Stack Candidates
- **Frontend**: Next.js + Tailwind (comparison UI)
- **Rendering**: Sandboxed iframes for live preview
- **Storage**: SQLite or JSON files (keep it simple initially)
- **Runner**: Node.js scripts hitting model APIs
- **Models**: Anthropic API, OpenAI API, Google AI API
