# ADR 0006: Server-Sent Events for Generation Progress

## Status

Superseded by [ADR-0007](0007-static-client-side-app.md)

## Context

The `/api/generate` endpoint previously operated as a blocking POST request — the client sent the generation parameters, waited (potentially minutes) for all models and variants to complete, and received a single JSON response. During this time:

- The user had no visibility into which model/variant was currently generating
- There was no way to cancel an in-progress generation
- The browser could time out on long-running requests
- No cost or duration information was available until the entire run completed

The runner already supported an `onProgress` callback internally, but this was only used for server-side logging — no progress information reached the client.

## Decision

Convert the `/api/generate` POST endpoint from a blocking JSON response to **Server-Sent Events (SSE)** streaming. The server returns a `ReadableStream` with `text/event-stream` content type, sending typed events as generation progresses:

### SSE Event Types

1. **`progress`** — Fired per-variant with status (`generating`, `complete`, `error`), accumulated cost, duration, tokens, and completion counts
2. **`complete`** — Fired once when the entire run finishes, containing the run summary (same data previously returned as the JSON response, minus full HTML content)
3. **`error`** — Fired if the run fails catastrophically, containing the error message

### Cancellation

An `AbortController` is threaded through the entire call chain:

- Client creates an `AbortController` and passes `signal` to `fetch()`
- API route listens for `request.signal` abort and forwards to its own `AbortController`
- `runBenchmark()` accepts an optional `signal` in `BenchmarkOptions`, checking `signal.aborted` before each variant
- `callOpenRouter()` passes the `signal` directly to the underlying `fetch()` call

This allows the user to cancel generation at any point, stopping in-flight API calls.

## Alternatives Considered

### 1. WebSocket

More complex to set up in Next.js App Router (requires separate WS server or Edge Runtime workarounds). SSE is simpler for unidirectional server→client streaming and works over standard HTTP.

### 2. Polling endpoint

Would require maintaining generation state in memory/database and a separate `GET /api/generate/status/:id` endpoint. More infrastructure, more complexity, and less responsive than SSE push.

### 3. Keep blocking + increase timeout

Doesn't solve the UX problem — users still see no progress. Also fragile with proxy/CDN timeout limits.

## Consequences

### Positive

- Users see real-time progress: current model, variant number, completion percentage
- Running cost tally visible during generation (from OpenRouter response data)
- Estimated time remaining shown after 2+ variants complete
- Per-model status cards show which models are done, in progress, or errored
- Cancel button allows aborting expensive generation runs mid-flight
- No additional infrastructure needed — works with Next.js App Router ReadableStream

### Negative

- SSE parsing on the client is slightly more complex than `await res.json()`
- If the connection drops mid-stream, the client won't receive remaining events (acceptable for a local dev tool)
- Validation errors (400/401) are still returned as regular JSON before the stream starts, so the client must handle both response types

### Neutral

- The `onProgress` callback signature was extended with `cost`, `durationMs`, `tokens`, and `error` fields — backward compatible since all new fields are optional
- The `AbortSignal` parameter is optional throughout the call chain — existing code that doesn't pass a signal continues to work unchanged
