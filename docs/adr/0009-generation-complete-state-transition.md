# ADR 0009: Fix State Transition Gap on Generation Completion

**Date:** 2026-02-07
**Status:** Accepted

## Context

When background generation completed, the UI would briefly flicker to "No design data available" before the user refreshed the page (which restored everything correctly). This was a state management bug in the handoff between live in-memory data (`partialRun`) and persisted IndexedDB data (`currentRun`).

### How `displayRun` works

The app maintains two sources of run data:

- **`partialRun`** — live in-memory data built incrementally during generation, owned by `useBackgroundGeneration`
- **`currentRun`** — data loaded from IndexedDB, owned by `page.tsx`

`displayRun` selects between them:

```typescript
const displayRun = useMemo(() => {
  if (currentRunId === activeRunId && partialRun) {
    return partialRun;  // Live data during generation
  }
  return currentRun;    // Persisted data otherwise
}, [currentRunId, activeRunId, partialRun, currentRun]);
```

### The bug

When the last variant finished, a 1500ms timeout fired in `useBackgroundGeneration` that:

1. Cleared `activeRunId` to `null` (sync)
2. Cleared `partialRun` to `null` (sync)
3. Called `onComplete(runId)` which triggered an async IndexedDB reload

Between steps 2 and 3 resolving, `displayRun` fell through to `currentRun` — which was stale. It had been loaded from IndexedDB early in generation (when `currentRunId` was first set via the `activeRunId` sync effect) and never refreshed, because `currentRunId` never changed and the load `useEffect` didn't re-fire.

### Why refresh fixed it

On page load, `currentRunId` is set fresh, the `useEffect` fires, and `currentRun` loads the complete data from IndexedDB.

## Decision

Two changes to ensure `partialRun` stays available until `currentRun` is refreshed:

### 1. Await `onComplete` before clearing state (`useBackgroundGeneration.ts`)

Changed the completion timeout to `await` the `onComplete` callback before clearing `partialRun` and `activeRunId`. The callback type was widened from `(runId: string) => void` to `(runId: string) => void | Promise<void>`.

### 2. Explicit IndexedDB reload in `onComplete` (`page.tsx`)

Made `handleGenerateComplete` async and added an explicit `dbLoadRun(runId)` call. This is necessary because `currentRunId` is already set to `runId` (from the `activeRunId` sync effect), so the `useEffect` that normally loads `currentRun` won't re-fire.

### Result

The state transition sequence becomes:

| Step | `partialRun` | `currentRun` | `displayRun` |
|------|-------------|-------------|-------------|
| Generation active | full data | stale | `partialRun` |
| `onComplete` called, awaiting | full data | loading | `partialRun` |
| `onComplete` resolves | full data | fresh | `partialRun` |
| State cleared | `null` | fresh | `currentRun` |

There is never a render frame where `displayRun` lacks data.

## Consequences

### Positive

- No flicker on generation completion — seamless transition from live to persisted data
- Minimal change footprint (two files, ~10 lines)
- No new state variables or effects

### Negative

- The completion state clear is now gated on an async IndexedDB read, adding a small delay (~5-20ms) before the generation indicator fully resets. This is imperceptible to users.

## Alternatives Considered

### Force `currentRunId` change to re-trigger the load effect

Set `currentRunId` to `null` then back to `runId` to force the `useEffect` to re-fire. Rejected: causes an unnecessary `null` render cycle and is fragile.

### Keep `partialRun` alive indefinitely and clear it from page.tsx

Have page.tsx clear `partialRun` via a hook method after confirming `currentRun` is fresh. Rejected: leaks ownership — `partialRun` is internal to the generation hook and shouldn't be managed externally.

### Add a separate `useEffect` watching for `partialRun` transitions

Watch for `partialRun` going from non-null to null and trigger a reload. Rejected: indirect and harder to reason about than the explicit await approach.
