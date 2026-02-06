# ADR-0003: Next.js 15 Project Scaffolding

## Status
Accepted

## Date
2026-02-06

## Context

We need to set up the initial project structure for AI UI Benchmark. The project requires:
- A web UI for browsing and comparing AI-generated designs
- Server-side API routes for triggering generation and serving archived results
- TypeScript for type safety across the full stack
- Tailwind CSS for rapid UI development with a dark theme

## Decision

### Framework: Next.js 15 with App Router
- **Next.js 15** provides both the frontend framework and API routes in a single project
- **App Router** (not Pages Router) for modern React patterns including Server Components
- **`src/` directory** to keep source separate from config files
- **React 19** for latest features and performance improvements

### Styling: Tailwind CSS v4
- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin
- **Dark theme by default** via `className="dark"` on the HTML element
- No CSS-in-JS or component library — keeping dependencies minimal

### TypeScript Configuration
- **Strict mode** enabled for maximum type safety
- **Path aliases** (`@/*` → `./src/*`) for clean imports
- **Bundler module resolution** as recommended for Next.js

### Project Structure
```
src/
├── app/          # Next.js pages and API routes
├── components/   # React UI components
├── lib/          # Shared types and config
└── runner/       # Server-side generation engine
```

This separation keeps concerns clear:
- `app/` for routing and pages
- `components/` for reusable UI pieces
- `lib/` for shared code used by both client and server
- `runner/` for server-only generation logic

### Package Manager: npm
- Standard, no additional tooling required
- Lock file committed for reproducible builds

### No Environment Files
- API keys stored in browser `localStorage` only (per ADR-0002)
- No `.env` files needed or committed
- Keys passed to API routes via request headers

## Consequences

### Positive
- Single project handles both UI and API — no separate backend to maintain
- Tailwind v4 provides fast styling with minimal config
- TypeScript catches errors early across the full stack
- App Router enables modern patterns (Server Components, streaming)
- Minimal dependencies — easy to understand and maintain

### Negative
- Next.js 15 is relatively new — some ecosystem tools may lag
- Tailwind v4 has breaking changes from v3 (new config format)
- App Router has different mental model from Pages Router — steeper learning curve

### Risks
- Generated HTML in iframes may have security implications — mitigated by `sandbox` attribute
- File-based archive could become slow with many runs — acceptable for a personal tool

## Alternatives Considered

### Vite + React
- Would need a separate API server
- More setup for file serving and API routes
- Rejected: Next.js provides everything in one package

### Tailwind v3
- More stable, more community resources
- Rejected: v4 is the future, and the project is greenfield — no migration needed

### Pages Router
- More documented, more examples available
- Rejected: App Router is the recommended approach for new Next.js projects
