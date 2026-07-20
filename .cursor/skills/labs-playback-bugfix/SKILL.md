---
name: labs-playback-bugfix
description: Diagnoses and fixes Labs playback, notation, VexFlow, and portaled picker regressions using root cause classes and regression tests. Use when fixing drum highlights, stuck notes, VexFlow beams, async load empty states, stop during instrument load, portal menu styling, or playback-ui-regressions failures.
---

<!-- AUTO-GENERATED from .agents/skills/labs-playback-bugfix/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs playback bugfix

## Before editing

1. Matching paths auto-load [`.agents/rules/playback-ui-regressions.mdc`](../../rules/playback-ui-regressions.mdc).
2. Deep context (load on demand):
   - [references/playback-hook-pattern.md](references/playback-hook-pattern.md)
   - [references/playback-rendering-audit.md](references/playback-rendering-audit.md)

## Workflow

1. **Classify root cause** — one of: `stale state` · `portal styling` · `render order` · `async race` · `empty-state logic` · `fake stopAll` · `missing invariant` · `test gap`
2. **Fix** using the matching invariant:
   - Loading: `activeSong = draft ?? live.entity`; never infer missing from `!data`
   - Stable props: memoize rhythm/style objects; no inline `{}` into notation hosts
   - Portal skins: `appearance` on trigger **and** menu; allowlist `.shared-playback-field-select-popover`
   - Async stop: `playbackGenerationRef` + check after every `await`; real `stopAll()`
   - VexFlow: format → beams → draw → redraw stems → draw beams → highlight toggle
3. **Add regression test** — Vitest for logic; `e2e/playback-ui-regressions.spec.ts` for user-visible integration
4. **Fill PR bug-fix handoff** — [`.github/pull_request_template.md`](../../../.github/pull_request_template.md)

## Ask first

- Visual baseline updates (`e2e/visual/*-snapshots/`) — use skill `labs-visual-regression`

## Verify

```bash
npx playwright test e2e/playback-ui-regressions.spec.ts
npm run presubmit
```
