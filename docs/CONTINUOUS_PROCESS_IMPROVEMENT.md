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
- `wrong-io-tier` — preview UI used session-weight fetch (e.g. alt=media before thumbnails); fix with tier policy + regression test
- `revoked-blob-display` — UI showed `blob:` URLs that LRU/cache eviction revoked (`ERR_FILE_NOT_FOUND`, blank thumbs, tab OOM); fix with https-only grid display + invariant tests (see [`GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md))
- `ux-gestalt` — related controls separated or parallel surfaces use different shells/verbs
- `ux-redundancy` — duplicate copy, progress bars, or controls in one viewport
- `ux-visual-weight` — excessive borders, shadows, card-in-card nesting
- `ux-spec-violation` — padding, contrast, alignment grid breaks
- `ux-journey-overload` — unclear primary action; too many equal CTAs
- `optimistic-ui-gap` — local edit updates chips but shared suggestions/filters read only persisted state; fix with session registry or parent merge (see `gestureTagRegistry.ts`)
- `render-cascade` — lightweight control state in parent re-renders heavy grid/list (fix: isolate state + memo)
- `main-thread-jank` — O(n) sort/shuffle/index on interaction path
- `warmup-storm` — prefetch or queue rebuild on unrelated config changes
- `pedagogy-reveal-gap` — quiz feedback shows ground truth that contradicts the lesson (e.g. identical chips on gray after a perceived-contrast item); fix with induced-read reveal + copy + minimum perceptual delta gates
- `static-hosting-cors` — local Vite proxy masks browser CORS/referrer failures on GitHub Pages; guest or public Drive I/O must use session BFF or same-origin proxy, not direct `googleapis.com` from the browser (see `buildPublicDriveAltMediaUrl.ts`, `workers/labs-session-bff/src/publicDriveProxy.ts`)
- `feasibility-misjudged` — heavy investment in an approach that needed significant **manual human labor** (3D modeling, rigging, pose-matching, asset cleanup) to reach the required quality, when the labor cost and low automation-yield should have been **flagged up front** so the user could choose. Fix: feasibility gate before big new asks — see [`.cursor/rules/feasibility-first.mdc`](../.cursor/rules/feasibility-first.mdc). Prefer a cheap falsifying spike (one import + alignment screenshot) over building the full pipeline first.

Add a new class only when several future bugs would share it.

## Where to codify improvements

Prefer **enforcement + one canonical doc** over long narrative. In priority order:

1. **Regression test** — Vitest for logic; Playwright smoke for user-visible integration (`e2e/playback-ui-regressions.spec.ts` is the pattern for cross-app smokes).
2. **Cursor rule** (`.cursor/rules/*.mdc`) — file-scoped, under ~50 lines, concrete examples; or repo **skill** for multi-step workflows (`.cursor/skills/`).
3. **Checklist in living docs** — `SHARED_UI_CONVENTIONS.md`, `PLAYBACK_HOOK_PATTERN.md`, app `DEVELOPMENT.md`.
4. **PR template / workflow** — handoff fields humans and agents reuse.
5. **ADR** — only for **material** cross-cutting decisions ([`docs/adr/README.md`](adr/README.md)).

**Codify on second occurrence:** if the same **root cause class** shows up twice in one session or across two sessions, **implement** a durable artifact (test, rule, smoke, doc section) in the same PR when practical — do not wait for a third incident or only add a backlog row.

Implement in the **same PR** when the user asked to codify **or** the root cause class hit twice; otherwise **offer** a short prioritized list and let the user choose.

## Handoff types

| Name                      | Purpose                                | Doc                                  |
| ------------------------- | -------------------------------------- | ------------------------------------ |
| **Iteration handoff**     | Next person needs mid-task state       | `DEVELOPMENT.md` § Iteration handoff |
| **Process retrospective** | Improve workflow after a session       | This file                            |
| **Bug-fix handoff**       | Record symptom class for searchability | PR template                          |

## Agent default at session end

Before closing a substantial session:

1. **Deliver** a retrospective using the skill template (bullets, not an essay)—**required**, not optional.
2. If improvements are clear and low-risk, **propose** specific files (rule, doc section, smoke test, `UX_AGENT_GUIDE` section).
3. If the user asked to codify—or the same root cause class appeared twice—**implement** and run `npm run presubmit`.
4. Record what landed in the PR **Process improvements** section; deferrals in [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md).

Always-on rule: [`.cursor/rules/session-retrospective-mandatory.mdc`](../.cursor/rules/session-retrospective-mandatory.mdc).

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
| Dexie `undefined` → false empty   | `resolveDexieLiveQuery` + `dexie-live-query-empty-states.mdc` + `*Hydrated` flags   |

Use these as templates for the **kind** of artifact to add next time—not as a mandate to duplicate structure.
