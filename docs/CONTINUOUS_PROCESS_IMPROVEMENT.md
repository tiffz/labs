# Continuous process improvement

Labs treats **how we work** as a product surface alongside the apps. After meaningful sessions, agents and humans should look for durable improvements—not one-off fixes buried in chat history.

**Agent workflow:** skill `labs-session-retrospective` (`.cursor/skills/labs-session-retrospective/SKILL.md`); always-on rule `.cursor/rules/session-retrospective-mandatory.mdc`.  
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
- `portal styling` — trigger skin ≠ portaled menu skin; click-outside not allowlisted. Audited 2026-07: Piano/Chords/Stanza document-dismiss handlers each scope to their own small ref-contained UI and none embed the portaled drum Edit; re-check when a dismiss handler wraps a surface that portals pickers.
- `render order` — VexFlow beams/highlights at wrong lifecycle step
- `async race` — schedule after stop; missing generation token
- `empty-state logic` — `!data` treated as missing instead of loading
- `fake stopAll` — gain duck without abandoning scheduled voices
- `missing invariant` — undocumented model rule (e.g. selection by id not index)
- `test gap` — logic covered but not user-visible integration
- `ux revision churn` — many human cycles on basic gestalt/theme parity; fix with scoped rule + living checklist
- `hmr false confidence` — presubmit green but dev shell broken after hot reload; hard-refresh affected route
- `wrong-io-tier` — preview UI used session-weight I/O (e.g. Drive `alt=media` before thumbnails, or full-res `dataUrl`s in Zine Studio grids); fix with tier policy + regression test / app rule (`gesture-media-tiers.mdc`, `zines-image-display-tiers.mdc`)
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
- `ci-blocking-idle` — session time burned watching a CI/CD run (≈8–15 min) instead of backgrounding it. Fix: presubmit is the gate; after push arm auto-merge + background `npm run ci:watch` with a failure-only notification and keep working — see [`.cursor/rules/ci-background-watch.mdc`](../.cursor/rules/ci-background-watch.mdc), [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md) § CI without blocking.
- `css-import-order` — extracted or moved `@import` below other rules; browsers silently drop the import and large UI regions lose all styles. Fix: keep `@import` at file top (after `@charset`/comments only); `npm run check:css-import-order`; document in app `DESIGN.md` when splitting CSS files.
- `css-syntax-error` — orphan braces or missing selector from a partial CSS edit; Vite/PostCSS blocks the app shell at dev time. Fix: `npm run check:css-import-order` (PostCSS parse pass on every `src/**/*.css`).
- `html5-duration-shrink` — media `timeupdate` / `durationchange` / `ended` writers overwrite transport duration with short HTML5 metadata below a longer decoded/fingerprint horizon, cutting off song tails. Fix: sticky max via `resolveStickyTransportDurationSec`; see [`STANZA_PLAYBACK.md`](STANZA_PLAYBACK.md) § Duration trust.
- `product-naming-drift` — user-facing copy uses a legacy or adjacent name for a Labs app (e.g. calling Stanza “Segno”). Fix: [`USER_COPY_STYLE.md`](USER_COPY_STYLE.md) § Cross-app product names + app `AGENTS.md` pitfall + naming regression test.
- `filter-selection-orphan` — a filter/chip narrows the visible set but leaves off-grid items selected, so counts/session queues disagree with what the user sees. Fix: prune selection to visible/eligible ids on filter change (see `gesturePracticeSelection.ts`).
- `hmr-context-identity` — React context object recreated across Provider + hook modules after Fast Refresh (“outside Provider” while Provider is mounted). Fix: pin the context on `globalThis` (see `encoreSyncContextStore.ts`). Audited 2026-07: all other context stores keep `createContext` in a dedicated module separate from the provider (the primary defense); apply the `globalThis` pin only where a flake recurs.
- `drive-resumable-308` — Drive resumable chunk PUTs via `fetch` break because the browser treats HTTP 308 as a redirect. Fix: XHR for chunk PUTs (`driveResumableUpload.ts` + test).
- `network-io-suspended` — background uploads/sync assumed always-on network; offline or suspended tabs lose progress. Fix: resumable session state + explicit resume path (see `gesture-upload-offline-resume.spec.ts`).
- `e2e-port-collision` — parallel Playwright runs or a stale dev server fight over the fixed port; specs fail on connect. Fix: `--strictPort` + `reuseExistingServer` config, one webServer owner per run.
- `local-first-breach` — a flow that should work offline/local-first requires network or a Google account (e.g. Drive-first pack creation). Fix: local-blob foundation with upload-later; see [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md).
- `reactive-audio` — audio scheduled reactively on UI/state events instead of a look-ahead scheduler; drifts or stutters under load. Fix: platform scheduler per [`SHARED_AUDIO_PLATFORM.md`](SHARED_AUDIO_PLATFORM.md).
- `icon-fouc-clip` — Material Symbol / note-symbol FOUC boxes crop glyph ink after font/metrics or cascade-layer changes. Two failure modes: (1) `overflow: hidden` with height ≈ font-size; (2) unlayered Google Material Symbols CSS (`font-size: 24px`) beats `@layer components` app rules that reserved a smaller box. Ligature width checks still pass. A third mode: chrome whose height cannot resolve (`height: 100%` / `align-self: stretch` with nothing to stretch against) collapses to content size, so shrinking the icon shrinks the button in lockstep and the ratio never improves — pin a `min-height`. A fourth: a box given `width`/`height` but no `font-size` inherits the vendored 24px default and overflows. Fix: unlayered icon size rules + `overflow: visible` (or slightly undersized font inside radius-clipping parents); guard via `assertVisibleMaterialIconsNotCssClipped` / `materialIconCssWouldClipInk` ([`VISUAL_JUDGE_RUBRIC.md`](VISUAL_JUDGE_RUBRIC.md) T1.1); rule [`material-icon-sizing.md`](../.agents/rules/material-icon-sizing.md). **Measure in a browser — cascade reasoning misleads here.**
- `icon-font-layout-shift` — an icon element still holds its ligature name as literal text until the icon font loads, and a fallback family renders that text far wider than the glyph, so any chrome sized by content is born too wide and snaps narrower on load (measured: Darbuka Play 89px, Piano 126px, Words 125px). Hiding the color alone does not help — layout still flows from the text. Fix: reserve the settled `1em` box during `icons-pending` (`src/shared/ui/icons/materialIcons.css`); never hand layout back with `width: auto` at higher specificity without a matching `html.icons-pending` override. Guard: `e2e/smoke/icon-font-layout-shift.spec.ts`; rule [`material-icon-sizing.md`](../.agents/rules/material-icon-sizing.md).
- `cascade-layer-token-override` — app/host theme tokens in `@layer` lose to unlayered shared CSS (AppSlider purple track, Material Symbols `font-size: 24px`, BPM geometry). Fix: shared primitives resolve via `var(--token, fallback)` **without assigning** the token unlayered; host overrides that must win stay unlayered. See [`THEMING_DECISIONS.md`](../src/shared/components/music/THEMING_DECISIONS.md) § CSS `@layer` Cascade Pitfall.
- `focus-open-popover-loop` — text field opens a popover on `focus`, close returns focus to the field → menu reopens; or close leaves focus on the field so click cannot reopen. Fix: suppress open-on-focus after close + **click `force` open** + Escape `stopPropagation` ([`A11Y_MENU_PATTERNS.md`](A11Y_MENU_PATTERNS.md) § Focus-opens).
- `parallel-control-geometry` — two control types in one panel (e.g. `AppSlider` + `AppLinearVolumeSlider`, or 28px vs 36px fields) look broken even when each is “correct” alone. Fix: one primitive per panel job; one height token for parallel rows ([`SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md); visual rubric T1.7 / T1.11).
- `upgrade-spotcheck-gap` — toolchain upgrades land with green CI but miss app-skin regressions (icon FOUC, purple sliders, menu focus loops) because full-page visuals bury small chrome and glyph gates only check width. Fix: post-upgrade 5-app smoke + component contracts (`check:volume-slider`, material icon clip assert, chord reopen Vitest); prefer cropped visual baselines for dense menus when a class recurs.
- `guidance-drift` — agent guidance contradicts code or other guidance (stale links, dead script names, duplicated gates that diverged). Fix: canonical homes + automated checks (`check:doc-links`, `check:agent-docs`).
- `tech-debt` — structural debt without a user-visible bug (oversized files, duplicated stacks, stale scaffolding). Not a bug class; track in [`TECH_DEBT_ROADMAP.md`](TECH_DEBT_ROADMAP.md) with entry criteria and link the row.
- `product-scope-drift` — a feature built without a clear audience, scope, or portfolio fit that overlaps another app, sprawls, or goes unused. Fix: the `labs-pm-review` proposal gate ([ADR 0024](adr/0024-major-change-ux-qa-review-gates.md)) + explicit non-goals in the app README; record deferrals with a re-open trigger in [`TECH_DEBT_ROADMAP.md`](TECH_DEBT_ROADMAP.md).
- `architecture-review-gap` — a one-way-door design decision (data model, sync contract, shared interface) made without alternatives or an ADR, that later churns or erodes. Fix: the `labs-architecture-review` design gate + an ADR + a fitness function (guardrail/ratchet) protecting the invariant.
- `ux-design-review-gap` — a shipped design regression a rendered-UI senior-design pass would have caught (Laws of UX, Material, theming, a11y). Fix: the `labs-ux-review` gate on major UX changes; codify a repeated miss into a visual-rubric row or lint.
- `qa-escaped-defect` — a bug that reached `main` a pre-merge stress test would have caught (edge case, interruption, data loss, usability). Fix: the `labs-qa-review` gate on major features; every confirmed bug leaves a regression test in the same PR.
- `guidance-bloat` — agent guidance that overlaps, drifts, or crowds context instead of staying small and sourced (a redundant subagent, a restated policy, an over-specified rule). Fix: the `labs-agentic-review` gate; prefer a machine check over a paragraph an agent must remember.
- `content-inaccuracy` — user-facing _material_ that is factually or pedagogically wrong, or a generator that produces invalid/blank artifacts (8 Scales exercises rendered nothing; a Sight exercise graded the perceptually-wrong answer as correct). Types/lint/screenshots all pass — the accuracy attribute has no compiler. Fix: an **exhaustive** content-integrity test (iterate the whole reachable set, not a sample) + domain-expert review on material change. See [`CONTENT_ACCURACY.md`](CONTENT_ACCURACY.md), rule `content-integrity.md`.
- `heavy-page-ci-flake` — a smoke/heuristic that runs a `page.evaluate` scan on a WebGL or large-catalog page times out under CI's software renderer while passing in <1s locally, because the scan competes with the page's still-running main-thread work (`/muscle/`, `/ui/` responsive floor). Fix: let the page settle (`waitForLoadState('networkidle')`, bounded) before scanning, give known-heavy routes timeout headroom via `smokeVisibleTimeoutMs`, and make WebGL-incompatible tools (Lighthouse) advisory for those routes — not a blanket timeout bump.

- `single-surface-guard` — an invariant is enforced at **one** call site or one entity while N siblings share the same contract unguarded (the "fixed 1 of N" pattern: VexFlow font-gate only on drums; merge-policy exhaustiveness only on `EncoreSong`; tombstone-scope resting on an undocumented accident). Fix: replace the point-guard with an **enumerate-all-surfaces ratchet** (walk the tree, assert every module in the class routes through one shared primitive), so new surfaces inherit the guard. See [`QUALITY_TOURNAMENT_2026-07.md`](QUALITY_TOURNAMENT_2026-07.md) Class A.
- `parallel-registry-drift` — the same fact is hand-maintained in ≥3 places with no cross-check (app slug across `APP_DIRS` lists + manifest + entry HTML + baselines; homepage catalog). Fix: one machine-readable source of truth that every consumer **derives** from, plus a divergence check that red-fails on mismatch. See [`QUALITY_TOURNAMENT_2026-07.md`](QUALITY_TOURNAMENT_2026-07.md) Class B.

This list is **canonical** — [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md) and [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md) link here instead of keeping copies. Add a new class only when several future bugs would share it.

## Standing regression-pattern review + tech-debt tournament

The retrospective (below) raises the floor one session at a time; this recurring review audits **whether the floor actually rose** — catching the `single-surface-guard` failure mode where a fix landed on one surface (or as prose) and the class kept biting. It is a read-only multi-agent workflow (regression archaeologists + tech-debt tournament judges by lens + a chair) — see [`QUALITY_TOURNAMENT_2026-07.md`](QUALITY_TOURNAMENT_2026-07.md) for the 2026-07 run and the reusable workflow shape.

**When it runs:** quarterly (with the guidance-eval 90-day gate), **or** triggered early by any of: (a) the same root-cause class appears a **3rd** time across sessions (2nd is codify-on-second; 3rd means the point-fix failed and a class-level ratchet is owed); (b) a roadmap/backlog row is deferred **twice**; (c) a data-loss or critical-severity regression ships to `main`.

**What it must output** (all four, or it didn't run): (1) ranked confirmed-findings, each grounded in `path:line`/commit sha, scored, deduped, lens-tagged; (2) any new root-cause labels for the canonical list above; (3) a waved plan mapping each winner to a [`QUALITY_SYSTEM.md`](QUALITY_SYSTEM.md) mechanism so it lands as a **failing gate, not a backlog row**; (4) a baseline/roadmap delta (ratchet baselines committed, [`TECH_DEBT_ROADMAP.md`](TECH_DEBT_ROADMAP.md) rows opened/closed). The grand-prize item lands or is scheduled the same cycle.

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

## Session throughput (cut wall-clock and tokens)

Long multi-bug sessions burn cost when agents thrash without a falsifying spike. Defaults:

1. **One spike first** — for visual/CSS bugs: one Playwright/CDP repro (computed style or pixel pad) before editing more than one file. Prefer numbers over screenshot captions (vision captions over-report clipping when primed).
2. **Name the cascade class early** — after Tailwind/`@layer`/MUI work, check `cascade-layer-token-override` before inventing new FOUC geometry.
3. **Batch spot-check apps, then stop** — after a toolchain upgrade, timebox a 5-app smoke (drums / words / zines / chords / encore). File remaining issues; do not keep expanding the same chat indefinitely.
4. **Scoped verify → then presubmit** — unit/e2e for the touched surface first; full `presubmit` once. Ignore unrelated dirty-tree failures unless they block the PR.
5. **Split when >2 root-cause classes** — ship or hand off a PR per class (`labs-split-to-prs`) instead of one mega-session.
6. **Codify on second hit in-session** — do not re-discover `@layer` vs unlayered three times; land the guard/doc in the same turn.

Always-on reminder: [`.cursor/rules/session-throughput.mdc`](../.cursor/rules/session-throughput.mdc).

## Examples already in the repo

| Session pain                              | What we codified                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Portaled sound menu wrong color           | `SHARED_UI_CONVENTIONS.md` checklist + `playback-ui-regressions.mdc` + e2e smoke                                                        |
| Drum highlight / stop latency             | `PLAYBACK_HOOK_PATTERN.md` + generation-token tests                                                                                     |
| “Song not found” flash                    | Empty-state rule + e2e smoke                                                                                                            |
| Encore chord paint selection bugs         | `encore-originals-chord-paint.mdc` + `originals/DEVELOPMENT.md`                                                                         |
| Nested drum Edit closes host menu / jumps | `isDrumPatternEditMenuTarget` + `resolveEventTargetElement`; frozen `anchorPosition`; `inline-drum-ux.mdc` + SHARED_UI nested checklist |
| Performance UX revision churn             | `PERFORMANCE_UX.md` checklist + `encore-performance-ux.mdc` + component map                                                             |
| UI shipped broken until manual QA         | `presubmit` + `npm run build` for shell changes + `encore-performance-routes` smoke                                                     |
| Dexie `undefined` → false empty           | `resolveDexieLiveQuery` + `dexie-live-query-empty-states.mdc` + `*Hydrated` flags                                                       |

Use these as templates for the **kind** of artifact to add next time—not as a mandate to duplicate structure.
