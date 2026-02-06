# ADR-0002: Store API Keys in Browser localStorage Only

**Date:** 2026-02-06
**Status:** Accepted

## Context
The tool needs an OpenRouter API key to generate designs. We needed to decide where to store it securely. Options included environment variables, config files, or browser storage.

## Decision
Store the API key exclusively in browser localStorage. No `.env` files, no server-side persistence, no dual config. Key is passed to the server via request headers on each API call.

## Consequences
- **Simple**: One storage location, one flow
- **Secure**: Key never written to disk on the server, never committed to git
- **User-friendly**: Settings page with clear key management UI
- **Trade-off**: No headless/CLI mode — all generation must go through the web UI
- **Trade-off**: Key is per-browser — switching browsers requires re-entering the key
- **Trade-off**: localStorage is clearable by the user (browser clear data)

## Alternatives Considered
- **Environment variables (`.env`)**: Standard approach but adds file management, gitignore risk, dual config complexity
- **Both localStorage + env vars**: Rejected — "one way to do things, not two" (per user preference)
- **Encrypted config file**: Overkill for a local dev tool
