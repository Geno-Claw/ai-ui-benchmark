# ADR-0004: Plain fetch() for OpenRouter API Client

## Status
Accepted

## Date
2026-02-06

## Context
The AI UI Benchmark project needs to communicate with OpenRouter's API to send prompts to multiple AI models. OpenRouter provides an OpenAI-compatible API, which means we could use the official `openai` npm package as a client.

We needed to decide between:
1. Using the `openai` npm package (or similar SDK)
2. Using the native `fetch()` API directly

## Decision
We will use plain `fetch()` to call OpenRouter's API instead of installing the `openai` npm package or any other HTTP client library.

## Rationale

### Minimal Dependencies
The project already has Next.js, React, and Tailwind — adding the `openai` package would add another dependency to maintain, audit, and keep updated. The OpenRouter API surface we use is small: a single POST to `/v1/chat/completions` with a JSON body and a few headers.

### Simple API Surface
We only need one endpoint: chat completions. The `openai` package provides abstractions for streaming, assistants, files, fine-tuning, embeddings, and dozens of other features we don't use. A single `fetch()` call does exactly what we need.

### Transparency
With plain `fetch()`, the exact request being made is visible in the code — no SDK internals to debug through. This makes it easy to understand, test, and troubleshoot API interactions.

### Node.js 18+ Native Support
Modern Node.js (18+) includes a native `fetch()` implementation. No polyfills or additional packages needed. Next.js 15 runs on Node.js 18+ by default.

### Easy to Extend
If we need to add new headers, change retry logic, or handle rate limiting differently, we have full control. No need to work around SDK conventions or configuration.

## Consequences

### Positive
- Zero additional dependencies for HTTP communication
- Full control over request/response handling
- Simple retry logic with exponential backoff
- Easier to debug API issues (the code IS the request)
- Faster install times and smaller node_modules

### Negative
- Must handle JSON serialization/deserialization manually (trivial)
- Must extract token usage from raw response (straightforward)
- No automatic request validation from SDK types
- If OpenRouter changes their API, we update our code directly rather than bumping a package version

### Neutral
- Type safety is maintained through our own TypeScript interfaces for request/response shapes
- Error handling is explicit rather than relying on SDK error classes
