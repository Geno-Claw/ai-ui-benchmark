# ADR 0008: Dark Glassmorphism UI Redesign

**Date:** 2026-02-07
**Status:** Accepted
**Supersedes:** Styling decisions in ADR-0005 (Gallery UI Architecture)

## Context

The original UI used a standard dark theme (gray-950 base, blue-600 accent, Inter font) that was functional but visually generic. As a tool for benchmarking AI-generated UI quality, the app itself should demonstrate strong design sensibility.

We evaluated 11 distinct design directions in parallel using git worktrees, each on its own branch:

1. Brutalist Industrial
2. Luxury Editorial
3. Retro Futuristic
4. Organic Pastel
5. Neo Brutalism
6. Vapor Wave Neon
7. Swiss Typographic
8. **Dark Glassmorphism** (chosen)
9. Cyberpunk Terminal
10. Art Deco Luxe
11. Zen Minimal

Each redesign was constrained to styling-only changes (Tailwind classes, CSS, fonts) with zero modifications to component logic, props, state, or data flow.

## Decision

We chose the **Dark Glassmorphism / Aurora** design for its premium feel, readability, and visual distinctiveness without sacrificing usability.

### Design System

- **Background:** Deep black (#050510) with three animated aurora gradient blobs (purple, teal, blue) using CSS `@keyframes` and `filter: blur(80px)`
- **Surfaces:** Frosted glass treatment on all cards, panels, and modals — `backdrop-blur-xl`, `bg-white/[0.04]`, `border border-white/[0.08]`
- **Typography:** Sora (headings) + DM Sans (body) via `next/font/google`, replacing Inter
- **Accent palette:** Purple (#a855f7), teal (#14b8a6), blue (#3b82f6) — used for interactive states, gradients, and glow effects
- **Custom dropdowns:** Native `<select>` elements replaced with custom glass-styled dropdown components to maintain visual consistency

### Files Changed (styling only)

- `src/app/globals.css` — Aurora animations, glass utilities, glow classes, scrollbar/selection styling
- `src/app/layout.tsx` — Font imports, aurora background container, deep black base
- `src/app/page.tsx` + all 9 components in `src/components/` — Glass treatment applied to every surface

### What Did NOT Change

- Component props, interfaces, and type definitions
- React state management and hooks
- Data flow and event handling
- IndexedDB persistence layer
- OpenRouter API integration
- package.json, tsconfig.json, or any build configuration

## Consequences

### Positive
- Distinctive, premium aesthetic that differentiates the tool
- Aurora background is pure CSS (no JS overhead)
- Glass surfaces create natural visual hierarchy through layered translucency
- Custom dropdowns eliminate jarring native browser chrome in dark contexts
- All styling is in Tailwind classes and CSS custom properties — easy to tweak

### Negative
- `backdrop-filter: blur()` has a performance cost on lower-end hardware, especially with multiple glass layers visible
- Custom dropdown components add ~70 lines each to GeneratePanel and RunSelector (replacing native `<select>`)
- The aurora animation uses three large blurred elements that consume GPU resources

### Lessons Learned
- Git worktrees are effective for parallel design exploration — 11 variants tested simultaneously with isolated dev servers
- CSS `position: relative` in utility classes can silently override Tailwind's `fixed` positioning when loaded later in the cascade — discovered when `aurora-border-glow` broke the GeneratePanel modal
- Native `<select>` option lists cannot be styled with CSS — custom dropdowns are required for any non-standard theme

## Alternatives Considered

All 10 other design directions were functional and built to completion. The top contenders were:

- **Swiss Typographic** — Clean and precise but felt too stark for a tool meant to showcase visual design
- **Cyberpunk Terminal** — Highly distinctive but the all-monospace, all-green aesthetic reduced readability for extended use
- **Zen Minimal** — Elegant light theme but didn't create enough visual contrast for side-by-side design comparison
