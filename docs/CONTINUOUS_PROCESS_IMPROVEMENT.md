# Continuous process improvement

Labs treats **how we work** as a product surface alongside the apps. After meaningful sessions, agents and humans should look for durable improvements—not one-off fixes buried in chat history.

**Agent workflow:** skill `labs-session-retrospective` (`.cursor/skills/labs-session-retrospective/SKILL.md`); pointer rule `.cursor/rules/session-retrospective.mdc`.  
**Where to put new artifacts:** [`DOCUMENTATION_STRATEGY.md`](DOCUMENTATION_STRATEGY.md).

## When to run a session retrospective

Run a lightweight review when **any** of these apply:

- The session fixed **two or more** bugs or spanned **multiple** subsystems (playback + UI + async I/O, etc.).
- The same **symptom class** appeared more than once (stale state, portal styling drift, render order, async race, empty-state logic).
- Investigation took noticeably longer because **docs, tests, or rules were missing**.
- The user asks for process feedback—or says the session is complete.

Skip or keep it to one sentence when the task was a single, obvious change with no friction.

## What to review

| Question                            | Look for                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| What slowed us down?                | Wrong first hypothesis, refactor churn, flaky repro, missing fixtures |
| What was misread?                   | Symptom vs root cause (e.g. “styling” vs portaled menu skin)          |
| What would have **prevented** this? | Rule, doc checklist, shared helper, smoke test, typed state machine   |
| What is already encoded?            | Point to existing tests/rules—avoid duplicate policy                  |

Structure findings as **symptom → root cause class → durable fix** (same fields as [`.github/pull_request_template.md`](../.github/pull_request_template.md) bug handoff).

## Root cause classes (reuse these labels)

- `stale state` — `useEffect` lag, unstable inline props, derived display one frame behind
- `portal styling` — trigger skin ≠ portaled menu skin; click-outside not allowlisted
- `render order` — VexFlow beams/highlights at wrong lifecycle step
- `async race` — schedule after stop; missing generation token
- `empty-state logic` — `!data` treated as missing instead of loading
- `fake stopAll` — gain duck without abandoning scheduled voices
- `missing invariant` — undocumented model rule (e.g. selection by id not index)
- `test gap` — logic covered but not user-visible integration
- `ux revision churn` — many human cycles on basic gestalt/theme parity; fix with scoped rule + living checklist
- `hmr false confidence` — presubmit green but dev shell broken after hot reload; hard-refresh affected route

Add a new class only when several future bugs would share it.

## Where to codify improvements

Prefer **enforcement + one canonical doc** over long narrative. In priority order:

1. **Regression test** — Vitest for logic; Playwright smoke for user-visible integration (`e2e/playback-ui-regressions.spec.ts` is the pattern for cross-app smokes).
2. **Cursor rule** (`.cursor/rules/*.mdc`) — file-scoped, under ~50 lines, concrete examples; or repo **skill** for multi-step workflows (`.cursor/skills/`).
3. **Checklist in living docs** — `SHARED_UI_CONVENTIONS.md`, `PLAYBACK_HOOK_PATTERN.md`, app `DEVELOPMENT.md`.
4. **PR template / workflow** — handoff fields humans and agents reuse.
5. **ADR** — only for **material** cross-cutting decisions ([`docs/adr/README.md`](adr/README.md)).

Implement in the **same PR** when the user asked to codify; otherwise **offer** a short prioritized list and let the user choose.

**Codify on second occurrence:** if the same **root cause class** shows up in two sessions (or two bugs in one session), default to proposing a durable artifact (test, rule, or smoke) without waiting for a third incident.

## Handoff types

| Name                      | Purpose                                | Doc                                  |
| ------------------------- | -------------------------------------- | ------------------------------------ |
| **Iteration handoff**     | Next person needs mid-task state       | `DEVELOPMENT.md` § Iteration handoff |
| **Process retrospective** | Improve workflow after a session       | This file                            |
| **Bug-fix handoff**       | Record symptom class for searchability | PR template                          |

## Agent default at session end

Before closing a substantial session:

1. **Offer** a brief retrospective (bullets, not an essay)—even if the user did not ask.
2. If improvements are clear and low-risk, **propose** specific files (rule, doc section, smoke test).
3. If the user wants them codified, **implement** and run `npm run presubmit`.
4. Record what landed in the PR **Process improvements** section when opening a PR.

Do not turn every typo fix into a process initiative. Scale effort to session complexity.

## Examples already in the repo

| Session pain                      | What we codified                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Portaled sound menu wrong color   | `SHARED_UI_CONVENTIONS.md` checklist + `playback-ui-regressions.mdc` + e2e smoke    |
| Drum highlight / stop latency     | `PLAYBACK_HOOK_PATTERN.md` + generation-token tests                                 |
| “Song not found” flash            | Empty-state rule + e2e smoke                                                        |
| Encore chord paint selection bugs | `encore-originals-chord-paint.mdc` + `originals/DEVELOPMENT.md`                     |
| Performance UX revision churn     | `PERFORMANCE_UX.md` checklist + `encore-performance-ux.mdc` + component map         |
| UI shipped broken until manual QA | `presubmit` + `npm run build` for shell changes + `encore-performance-routes` smoke |

Use these as templates for the **kind** of artifact to add next time—not as a mandate to duplicate structure.
