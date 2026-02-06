# Architecture Decision Records (ADR)

This folder documents significant design decisions, rationale, and changes throughout the project.

## Format

Each ADR is a markdown file named `NNNN-<short-title>.md`:

```
docs/adr/
├── README.md
├── 0001-openrouter-single-provider.md
├── 0002-localstorage-api-keys.md
└── ...
```

## Template

```markdown
# ADR-NNNN: <Title>

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated
**Supersedes:** ADR-NNNN (if applicable)

## Context
What is the issue or decision that needs to be made?

## Decision
What was decided and why?

## Consequences
What are the trade-offs? What becomes easier/harder?

## Alternatives Considered
What other options were evaluated?
```

## When to Write an ADR

- Choosing a technology, library, or pattern
- Changing an established pattern or approach
- Significant bug fixes that reveal a design flaw
- Deviating from the project spec (`docs/PROJECT_SPEC.md`)
- Any decision a future developer would ask "why did they do it this way?"
