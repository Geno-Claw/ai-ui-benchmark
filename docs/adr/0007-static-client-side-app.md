# ADR 0007: Static Client-Side App

**Date:** 2026-02-07
**Status:** Accepted
**Supersedes:** ADR-0006 (SSE Generation Progress)

## Context

The app used Next.js API routes as a server-side layer between the browser and OpenRouter. The server proxied API calls, read static files (prompts, skill text) from disk, and streamed progress via SSE. However, the actual server-side work was minimal — storage had already migrated to IndexedDB, the API key lived in localStorage, and the OpenRouter client (`openrouter.ts`) used plain `fetch()`.

This server dependency made deployment more complex than necessary — requiring a Node.js runtime (Vercel, a VPS, etc.) for what was fundamentally a client-side tool. The goal was to enable deployment to static hosts like GitHub Pages with zero infrastructure.

## Decision

Convert the app to a fully static client-side application by:

1. **Bundling prompts as static imports** — All 12 prompt JSON files are imported into `src/lib/prompts.ts` at build time instead of being read from disk at runtime via `fs.readdir`/`fs.readFile`.

2. **Bundling skill text as a string constant** — The frontend-design skill markdown is exported from `src/lib/skill-text.ts` instead of being read via `readFileSync`.

3. **Calling `runBenchmark()` directly from the browser** — The `useBackgroundGeneration` hook now imports and calls `runBenchmark()` with `onInit`/`onProgress` callbacks instead of going through an SSE endpoint. This eliminates the `/api/generate` route entirely. The SSE transport layer was just shuttling callbacks over HTTP — removing it simplifies the architecture.

4. **Direct OpenRouter API calls from the browser** — Key validation and generation requests go directly to `openrouter.ai` instead of being proxied through API routes.

5. **Next.js static export** — `output: "export"` in `next.config.ts` produces a plain `out/` directory of HTML/JS/CSS deployable to any static host.

6. **GitHub Pages deployment** — A GitHub Actions workflow builds and deploys the static site on push to `main`.

### Files removed
- All 5 API routes (`src/app/api/`)
- `src/runner/archiver.ts` (deprecated, replaced by IndexedDB)
- `src/runner/prompt-loader.ts` (replaced by static imports)

### Files added
- `src/lib/prompts.ts` — static prompt bank
- `src/lib/skill-text.ts` — bundled skill text
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Consequences

### Positive

- Zero-infrastructure deployment — static files served from GitHub Pages
- Simpler architecture — no server layer, no SSE parsing, no API route middleware
- Faster local development — no server-side code to compile
- The `runBenchmark()` → callback flow is more direct and easier to debug than SSE → parse → handle

### Negative

- OpenRouter CORS must work from the browser (appears to work today but is not officially documented)
- Cannot easily add server-side features in the future (e.g., agentic code generation that needs CLI access). A separate project would be needed for that.
- Adding new prompts requires a code change and rebuild (add JSON file to `prompts/`, update `src/lib/prompts.ts`)

### Neutral

- Generation performance is unchanged — `openrouter.ts` already used browser-compatible `fetch()`
- Resume/interruption handling is unchanged — IndexedDB persistence works identically
- The `HTTP-Referer` header in `openrouter.ts` now uses `window.location.origin` instead of a hardcoded localhost URL

## Alternatives Considered

### 1. Deploy to Vercel free tier as-is

Zero code changes. But adds a vendor dependency and account requirement for what is fundamentally a static tool. Also keeps server-side code that provides no real value.

### 2. Hybrid — static frontend + serverless API

Deploy the UI to GitHub Pages with a separate Cloudflare Worker or Vercel function for the API layer. More complex than necessary given the server does almost nothing.

### 3. Keep server for future agentic flows

The agentic use case (AI agents running CLI commands, managing dev servers) was evaluated but deemed a separate project concern. One-shot API generation works perfectly client-side.
