# ADR-0001: Use OpenRouter as Single API Provider

**Date:** 2026-02-06
**Status:** Accepted

## Context
The benchmark tool needs to call multiple AI models (Claude, GPT, Gemini, etc.). Originally we considered using each provider's SDK directly (Anthropic SDK, OpenAI SDK, Google AI SDK), which would require managing multiple API keys, multiple adapters, and multiple auth flows.

## Decision
Use OpenRouter as the sole API provider. One API key, one OpenAI-compatible interface, all models accessible.

## Consequences
- **Simpler**: One key, one SDK, one adapter — no per-provider code
- **Easier model expansion**: Adding a model = adding its OpenRouter ID to config
- **Cost tracking built in**: OpenRouter returns cost per request
- **Trade-off**: Slight latency overhead vs direct provider APIs
- **Trade-off**: Dependent on OpenRouter availability and pricing
- **Trade-off**: Some bleeding-edge models may not be on OpenRouter immediately

## Alternatives Considered
- **Per-provider SDKs**: More direct, but 3-4x the code and config complexity
- **LiteLLM proxy**: Self-hosted, but unnecessary overhead for a local dev tool
