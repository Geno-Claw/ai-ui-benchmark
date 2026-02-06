# ADR 0005: Gallery UI Architecture

## Status

Accepted

## Date

2026-02-06

## Context

We need a design gallery UI that allows users to:
- Browse all generated designs from a benchmark run
- Preview designs in live sandboxed iframes
- Swap between models and variants quickly
- Toggle between live preview and source code view
- Expand designs to fullscreen
- Start new benchmark runs and manage API keys

The UI must work entirely client-side with no external state management libraries, using only React hooks and Next.js API routes.

## Decision

### Component Architecture

We adopt a hierarchical component structure with clear responsibilities:

1. **`page.tsx`** — Application shell and state orchestrator. Manages top-level state (runs list, current run, modal visibility) via `useState`/`useEffect`. Fetches data from API routes and passes it down.

2. **`Gallery`** — Grid layout rendering one `ComparisonSlot` per model in the current run. Each slot can independently swap which model it displays.

3. **`ComparisonSlot`** — The core preview component. Combines iframe preview, source code view, model picker, variant carousel, zoom controls, and metadata display. This is intentionally a larger component because all these concerns are tightly coupled to a single "slot" concept.

4. **`VariantCarousel`** — Controlled component for navigating between variants (1-5). Stateless — parent owns the selected variant.

5. **`ModelPicker`** — Pill button group for model selection. Stateless — parent owns the selected model.

6. **`SourceView`** — Code viewer with line numbers, basic syntax highlighting (no external library), and copy-to-clipboard. Uses `dangerouslySetInnerHTML` for highlighted output since the content is generated from the user's own HTML (not user input in the traditional XSS sense).

7. **`RunSelector`** — Dropdown with run list, date/mode badges, and inline delete with confirmation.

8. **`Settings`** — Slide-over panel for API key management. Reads/writes `localStorage` directly.

9. **`GeneratePanel`** — Modal for configuring and triggering new benchmark runs. Fetches available prompts from `/api/prompts`, lets user select models and mode, and calls `/api/generate`.

### State Management

- **No external state library** — React `useState` and `useEffect` are sufficient for this single-page tool.
- **State lives in `page.tsx`** — runs list, current run ID, current run data, modal visibility.
- **Component-local state** — variant selection, zoom level, show/hide source are owned by each `ComparisonSlot` instance.
- **API key in localStorage** — never in React state beyond the Settings panel. Components read it directly when needed.

### Iframe Sandboxing

All generated HTML renders in `<iframe sandbox="allow-scripts" srcDoc={html}>`. The `sandbox` attribute prevents the iframe from accessing the parent page, localStorage, or making network requests beyond what `allow-scripts` permits.

### Styling

- Pure Tailwind CSS — no external UI library (shadcn, Radix, etc.)
- Dark theme: gray-950/900/800 backgrounds, blue-600 accent, consistent border colors
- All SVG icons inline — no icon library dependency

## Consequences

### Positive
- Zero additional dependencies — keeps the bundle small and build fast
- Simple mental model — data flows down from `page.tsx`, events bubble up
- Each component is independently testable
- Fullscreen mode reuses `ComparisonSlot` rather than a separate component

### Negative
- `ComparisonSlot` is a larger component (~200 lines) since it aggregates several concerns
- No URL-based state (deep linking to a specific run/model/variant) — acceptable for a local tool
- Source highlighting is basic (regex-based) — adequate for HTML but not production-grade for all languages

### Risks
- Large HTML documents in iframes may cause performance issues with many slots visible — mitigated by the 2-column grid limiting visible iframes
- `dangerouslySetInnerHTML` in SourceView could be a concern if the highlighting regex produces unexpected output — mitigated by the fact that we're highlighting user-controlled content that's already displayed in an iframe
