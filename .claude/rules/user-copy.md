---
paths:
  - 'src/**/*.tsx'
---

<!-- AUTO-GENERATED from .agents/rules/user-copy.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> User-visible copy — Labs voice and parallel verbs

# User-visible copy

Read [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) first. App deltas: nearest `src/<app>/COPY_STYLE.md` when present.

## Must

- **Short sentences**; front-load the point; button labels = next action (`Sign in with Google`, not `Submit`).
- **Parallel surfaces, parallel verbs** — same status/action uses the same string everywhere ([`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § Parallel surfaces).
- **Straight apostrophes** in contractions; plain language for errors (what happened + what to do next).

## Avoid

- **Em dashes** (U+2014) in UI strings — use a period or second sentence.
- Essay voice, stacked hedging, catalog/roadmap copy above primary CTAs.
- LLM tells: “Remember to…”, “It’s important to note…”, “In today’s session…”.

## Surfaces

- **Empty states:** one headline + one short line + CTA; fold setup into tooltips when dense.
- **Errors:** plain language, no blame; include recovery step when possible.
- **Permissions:** one honest line on-screen; full scope in app `README.md`.

When editing Encore/Stanza/Scales/Sight, also read that app’s `COPY_STYLE.md`.
