<!-- Generated 2026-07-22 by a 71-agent workflow: 5 regression archaeologists + 8 tech-debt contestants -> skeptical judges (verify+score vs code) -> chair synthesis. 57 findings, 55 confirmed. Re-run via the § cadence in CONTINUOUS_PROCESS_IMPROVEMENT.md. -->

# Labs Continuous-Improvement Plan: Regression Patterns & Tech-Debt Tournament

_Tournament chair synthesis. Every recommendation traces to a confirmed, judge-scored finding. Mechanism labels reference `docs/QUALITY_SYSTEM.md` (measure / ratchet / guidance / codification); root-cause labels reference `docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` § Root cause classes._

The single unifying insight across both tracks: **Labs already owns the exact mechanism that would prevent almost every finding here** — the advisory-ratchet pattern (`scripts/check-jscpd-ratchet.mjs` + `docs/jscpd-baseline.json` + `--update`, and its sibling `scripts/check-css-important.mjs` + `css-important-baseline.json`). The problem is not a missing tool; it is that the tool was cloned to ~2 attributes and left prose-only for the rest. The plan below is mostly _"clone the ratchet you already trust to five more baselines."_

---

## 1. Regression patterns → systemic process changes

The archaeology findings collapse into **four dominant classes**. Two of them (Class A and B) account for the entire top of the leaderboard.

### Class A — Single-surface invariant, latent on every sibling _(the "fixed 1 of N" class)_

**How often it bit:** 8 of 24 regression findings, including four of the five top-scored (80s).

- VexFlow async-font first-draw gate enforced only on drum surfaces; Words/Chords/Melodia/ScoreDisplay still exposed (`vexflow-music-font-gate-drums-only`, 80).
- Generation-token stop-race guarded by timer-only ratchet, not the per-hook token invariant (`playback-generation-token-invariant-guardrail`, 80).
- Merge-policy exhaustiveness ratchet covers only `EncoreSong`; every other synced entity silently drops new fields (`merge-policy-ratchet-encoresong-only`, 80).
- Drive guard-parity "test" is a static factory-import grep, not behavioral parity (`drive-guard-parity-static-grep`, 74).
- "Filled beats empty" guards the pull path only; push blind-overwrites shrunken local (`push-path-no-filled-beats-empty-guard`, 62).
- Highlight-reapply-after-redraw is a call-site contract with no per-renderer test (`notation-highlight-reapply-contract`, 34); tombstone-scope (30) and dedup ancestor-set (30) rest on undocumented accidents.

**Maps to existing labels:** `missing invariant`, `async race`, `test gap`, `render order` — this class _cuts across_ the existing labels, which is exactly why prose enforcement keeps missing it.
**Propose one new label:** `single-surface-guard` — _an invariant enforced at one call site / one entity while N siblings share the same contract unguarded._ Add to the canonical list.
**The ONE structural change:** For each recurring invariant, replace the point-guard with an **enumerate-all-surfaces ratchet** in the shape of `audioPatternRegistry.test.ts` — a test that walks the tree, finds _every_ module in the class (every VexFlow `Renderer`, every `*Playback` hook, every synced-entity merge map, every app's sidecar-download fn), and asserts each routes through the shared primitive. Back it with one _shared_ primitive (a `usePlaybackGeneration` hook, a `MergePolicy` map `satisfies Record<keyof T, MergePolicy>`, one `trashableRootIds` helper) so new surfaces _inherit_ the guard instead of re-implementing it. This is the reinforcing loop from QUALITY_SYSTEM.md applied literally: prose that has recurred 3× becomes an executable enumerator.

### Class B — Parallel registries with no single source of truth

**How often it bit:** 4 findings, led by the #1 overall (`app-slug-parallel-registries`, 83).

- App slug replicated across ≥3 `APP_DIRS` lists + manifest + entry HTML + 4 baselines, none cross-checked (83).
- Homepage catalog drifts both ways — auto-discovery over-lists, manual manifest under-lists (`labs-catalog-coverage-invariant`, 58).
- Icon FOUC/clip/shift guards enumerated per-mode/per-route instead of registry-derived (`icon-fouc-layout-shift-registry-drift`, 68).
- No general first-paint CLS guard; only icon-width delta is measured, and even that isn't driven from `SMOKE_ROUTE_SPECS` (`first-paint-cls-guard`, 70).

**Maps to existing labels:** `missing invariant` + `guidance-drift`.
**Propose one new label:** `parallel-registry-drift` — _the same fact hand-maintained in ≥3 places with no cross-check._
**The ONE structural change:** Establish **one machine-readable app/route registry** as source of truth (promote the manifest or add `apps.ts`) and have every consumer _derive_ its app/route set from it — `generate-shared-catalog`, `check-import-boundaries`, `run-scoped-e2e`, baseline keys, and the icon/CLS smokes. Add a divergence check that red-fails when any consumer's set ≠ the registry. This converts three CSS/layout findings and both catalog findings into one guard, because icon-chrome and CLS budgets become _registry-derived_ smokes that a new app inherits without editing a `ROUTES` array.

### Class C — Environment-dominated numeric budgets asserted as blocking merge gates

**How often it bit:** 5 findings; this was judged the **DOMINANT ROOT CAUSE** of e2e flake (`advisory-perf-budget-guardrail`, 80).

- Frame-time / ms-latency / software-WebGL load-time budgets red-fail merges on hardware variance (80).
- Dev-machine baselines disagree with CI Linux (gzip, PNG) (`baseline-platform-mismatch`, 58).
- Visual baselines drift on any height reflow / scrollbar-gutter flip (`visual-baseline-reflow-drift`, 57).
- Nested timeout math sized for a quiet machine collapses under parallel CI (`timeout-budget-math`, 36); post-hydration horizontal-scroll blind spot (19).

**Maps to existing label:** `heavy-page-ci-flake` (already canonical, CPI:77) — no new label needed.
**The ONE structural change:** A Vitest guardrail (shape of `e2eSelectorGuardrails.test.ts`) that greps e2e specs for `expect(<measuredMs|frame|budget>).toBeLessThan*(…)` in **blocking** position and fails unless the value flows through an advisory `report*()` helper; forbid frame-time assertions on any WebGL route. Pair with CI-aware constants as the _only_ sanctioned waits (`smokeVisibleTimeoutMs`, `expectMuscleCanvasReady`) and platform-stamped baselines (`baselines.meta.json { os: linux-ci }`, Docker regen as the sanctioned path). This makes "remember to make it advisory" — currently rediscovered per spec — a compiler-enforced convention.

### Class D — E2e/selector implementation coupling

**How often it bit:** 2 findings (`e2e-selector-implementation-coupling`, 64; `spa-native-link-nav-selector-guardrail`, 63) — and it re-broke app-by-app across 6+ apps during the nav-semantics rollout.
**Maps to existing label:** `test gap`.
**The ONE structural change:** Flip the guardrail from a denylist of known-bad selectors to an **allowlist convention** — e2e specs must reach targets via `data-testid`/role helpers in `e2e/helpers/`, and the guardrail fails any `.spec.ts` matching structural selectors (`button\.`, `tbody`, `tspan`, `.<slug>-card`) outside a helper module. Add an ESLint rule flagging `onClick={() => navigate(...)}` on non-anchors, anchored to ADR 0017's helper table so new apps inherit it. Prevents the whole class instead of appending a regex after each break.

_(Smaller residue: `cascade-layer-unlayered-token-scan` (46), `unstable-notation-props-no-lint` (37), `portal-styling-picker-dismiss` (30) are existing classes with partial guards; fold their fixes into Wave 3 shared primitives rather than treating as new classes.)_

---

## 2. Tech-debt tournament results

Ranked by score, overlapping submissions deduped, lens noted. All eight top items scored 44–80; the cluster at 80 is genuinely tied on impact, so the ranking below breaks ties by **severity × leverage** (how many other findings the fix unlocks).

| #        | Debt                                                         | Score / severity       | Lens(es) that surfaced it                                      |
| -------- | ------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------- |
| **🏆 1** | **Full typecheck is a decoy**                                | 80 / **critical**      | type-safety                                                    |
| 2        | **No per-file size/complexity ratchet**                      | 80 / high              | architecture-coupling **and** complexity-hotspots (two lenses) |
| 3        | **Data-loss Drive paths: zero coverage, prose-only mandate** | 80 / **critical**      | test-suite-health                                              |
| 4        | **React Hooks Compiler rules fully disabled (684 frozen)**   | 80 / high              | dependency-toolchain                                           |
| 5        | **VexFlowRenderer: one 1,115-line useEffect**                | 80 / high              | complexity-hotspots                                            |
| 6        | **knip `exports:'warn'` — no-op dead-code gate**             | 70 / high              | dead-code-orphans                                              |
| 7        | **Encore duplication + forked shared Drive/sync copies**     | 66 + 44 / **critical** | duplication (two submissions merged)                           |
| 8        | **Guidance enforcement is prose-only**                       | 64 + 63 + 58 / high    | guidance-doc-debt (three merged)                               |

### 🏆 GRAND PRIZE — The type-safety gate is a decoy _(highest leverage)_

CI and pre-commit run `tsconfig.app.json`, which **excludes every test/spec/e2e/audit file and relaxes strictness**; the real full typecheck has **172 errors and runs nowhere** (`typecheck-excludes-tests-full-config-unreachable`). 68 test files across 9 apps are typechecked by nothing.

**Why it's grand prize:** it is the _foundation the rest of the plan stands on._ Every ratchet we recommend below is a test; if the test suite itself isn't typechecked, a refactor can leave green tests asserting against shapes production already rejects — the guards silently rot. This one gate mechanically _subsumes_ three other confirmed findings: `test-fixture-type-drift` (42), `test-literal-rot-jazz-jazzy` (34, the `'jazz'`→`'jazzy'` assertion that can never match), and `tsconfig-strictness-drift` (34). Critical severity, whole-repo reach, and the fix is _cheap_ — copy the jscpd ratchet.
**Systemic fix:** `scripts/check-tsc-ratchet.mjs` running `tsc -p tsconfig.json` against a committed error-count baseline (warn-then-fail-on-increase). Burn down in tranches — test-file errors are mechanical — then flip to require exactly 0, delete the baseline, and replace `npm run typecheck` in CI/pre-commit with the full config. First reconcile the phantom base config (`tsconfig-strictness-drift`, 34): drop the unenforceable `erasableSyntaxOnly:true` that 18 production files already violate so the full config is green-able.
**Cost:** medium (mechanism small; burn-down is the work).

### 2 — No per-file size/complexity ratchet _(two lenses, highest breadth)_

The 600-line decomposition standard has **no enforcement**, so its own flagship pilot `StanzaWorkspace.tsx` sits at 3,053 lines / 94 imports and **35% of all source lives in oversized files** (`no-per-file-size-ratchet` + `component-size-ratchet-guardrail`). It only ever fell 3,694→3,053 after a documented session and stayed 5× over.
**Why it impedes quality:** every edit to a 3k-line orchestrator touching 94 modules pays a comprehension + merge-conflict + change-amplification tax, and with no ratchet these files _monotonically regrow_. This item **absorbs three god-component findings** (`stanza-workspace-god-component` 56, `sessionscreen-god-component` 62, and is the enabling gate for `vexflowrenderer-monster-useeffect` 80) — roadmap items 6, 7, 7b are all "queued/deferred" precisely because nothing forces the issue.
**Systemic fix:** `src/shared/componentSizeGuardrails.test.ts` in the exact shape of `sharedUiReuse.test.ts` / `sharedModuleCycles.test.ts` — a frozen `{file: max(lineCount, distinctImports)}` baseline for files over threshold; a touched file's numbers may only _decrease_, new files must be < 600 lines / ~25 distinct imports. Records 3,053 (Stanza) / 3,140 (SessionScreen) as immovable ceilings so decomposition becomes mechanically unavoidable rather than opt-in. **Cost:** small.

### 3 — Data-loss Drive paths: zero coverage, prose-only mandate

The modules deciding whether a user's deletions/edits survive sync (`/drive/`, `Undo`, `Recovery`, `Merge`, `Conflict`) have **zero test coverage** while the "mandatory" matrix is prose (`drive-dataloss-coverage-unenforced-mandate`, critical). A regression silently loses user data; no PR gate catches it.
**Systemic fix:** a coverage-manifest guardrail Vitest that enumerates those modules and fails when any is below a per-module floor or lacks a mapped characterization test; wire `test:coverage` into the **blocking** PR job. **Cost:** medium.

### 4 — React Hooks Compiler rules disabled, 684 violations frozen

The full suite is off behind a P3 row; 216 of 776 files already violate. `set-state-in-effect` (189) and stale-ref (419) _are_ the "stale state" correctness class in the CPI taxonomy (CPI:32) — a live-audio and sync correctness surface.
**Systemic fix:** do **not** wait for a 684-fix mega-PR (the reason it keeps slipping). Clone the ratchet: `check-react-hooks-ratchet.mjs` + `react-hooks-baseline.json`, set the 14 rules to `warn`, fail on net-new, allow counts to only drop. Freezes accrual in a small PR; burns down opportunistically on every touched file. Pair with the same treatment for the 40 `exhaustive-deps` suppressions (`exhaustive-deps-suppression-ratchet-gap`, 58). **Cost:** medium.

### 5 — VexFlowRenderer packs the whole pipeline into one 1,115-line useEffect

With a suppressed 10-dep array — render-order bugs (beams, highlights, font-gating) recur because the pipeline is one opaque effect with hand-maintained deps (`vexflowrenderer-monster-useeffect`).
**Systemic fix:** extract a pure `renderDrumScore(container, model): RenderHandles` helper (no React, unit-tested) per `COMPONENT_DECOMPOSITION_PATTERN.md` step 2, leaving a thin effect with an honest, lint-clean dep list; then enable ESLint `max-lines-per-function` so no future effect hides a 1,000-line body behind a disable. **Cost:** medium.

### 6 — knip dead-code gate is a no-op (`exports:'warn'`)

67 unused exports pass green and the quality dashboard _falsely reports the surface as guarded_ — the exact "green CI measuring the wrong thing" anti-pattern QUALITY_SYSTEM.md:106 warns against (`knip-exports-warn-noop-gate`).
**Systemic fix:** one-time burn-down of the 67, then flip `exports` to `error` (or a ratcheted baseline if a hard flip is too aggressive); update QUALITY_SYSTEM.md so the claimed gate matches enforcement. Companion cleanups: `knip-ignore-stale-drift` (44) and `parked-dead-code-knip-ignore` (48) — require ignore entries to carry ISO expiry and fail when stale. **Cost:** medium.

### 7 — Encore duplication + forked shared Drive/sync copies

Encore holds the **largest single duplication mass** (3,559 duplicated lines / 183 clone groups) _and_ has **forked two correctness-critical shared components** (Drive folder-URL parsing, sync-conflict merge review) _after_ they were extracted to `src/shared` — so a fix to the shared conflict dialog silently skips the largest app (513 files) (`encore-internal-duplication` 66 + `encore-forked-shared-drive-sync-components` 44, **critical**, data-loss-adjacent). This is the "duplication-caused bug appearing twice" trigger `TECH_DEBT_ROADMAP.md:35` names for a blocking gate.
**Systemic fix:** extract encore-local primitives (`useDraftUndo<T>`, one `SongPerformancesPanel` with a `variant` prop, one parameterized `BulkImportDialog`); migrate the forks onto `LabsDriveFolderPasteOrBrowseBlock` + `LabsPortfolioConflictReviewDialog` and delete them; enforce with an Encore-scoped jscpd budget line so the hotspot can't regrow, plus an import-boundary check flagging any app-local component mirroring a `src/shared` export prefix. **Cost:** large (dup) / medium (forks).

### 8 — Guidance enforcement is prose-only

Three merged submissions: the behavioral guidance-eval harness has **never run once** (`guidance-eval-harness-never-run`, 64) — the _sole_ mechanism that verifies guidance changes agent _behavior_; **21 of 60** AGENT_INVARIANTS "non-negotiable" rows are prose pointing to prose (`agent-invariants-unenforced-prose`, 63); and `guidance-drift` is itself a named root-cause class whose own guards can't detect it (`agent-invariants-drift-unvalidated-citations`, 58).
**Systemic fix:** (a) add a `validate-agent-docs.sh` check that fails when the newest `GUIDANCE_EVALS` run-log is empty or > 90 days old **and** any `.agents/**`/`AGENTS.md` changed since; (b) tag every AGENT_INVARIANTS row `enforcement-kind: test|script|gate|prose-only` and ratchet the prose-only count down; (c) extend `check-doc-links.mjs` to resolve backtick-quoted `*.test.ts`/`*.mjs` citations the way it already resolves `npm run` scripts. **Cost:** small–medium.

---

## 3. Cohesive coding-practices improvement plan

Sequenced so **cheap ratchets that freeze accrual land first** (they stop the bleeding and cost days), _then_ the decompositions they make safe. Each wave names its QUALITY_SYSTEM.md mechanism so it compounds.

### Wave 1 — Freeze accrual: clone the ratchet you already trust _(days; mostly `small`)_

One shared script shape (`check-jscpd-ratchet.mjs`) copied to six baselines. Mechanism: **measure + ratchet** (balancing loops).

1. **Full-typecheck ratchet** (`check-tsc-ratchet.mjs`) — 🏆 grand prize, do first; it protects every later ratchet-test.
2. **Per-file size ratchet** (`componentSizeGuardrails.test.ts`) — records today's ceilings; unblocks Wave 4 by forbidding regrowth.
3. **React-hooks + exhaustive-deps baseline ratchet** — freeze 684 + 40 suppressions.
4. **Coverage ratchet** (`coverage-threshold-no-ratchet`, 50) and **hex ratchet** (`hex-ratchet-missing`, 58) — same monotonic mechanism.
5. **Advisory-perf-budget guardrail** (Class C) and **knip exports flip** (#6).
6. **jscpd ratchet gets teeth**: hard-fail on net-new _cross-app / `src/shared`_ clones (`jscpd-ratchet-advisory-drift`, 49) so this wave's own duplication can't grow.

### Wave 2 — One source of truth: registry-derived guards _(1–2 weeks; medium)_

Mechanism: **codification** (one canonical registry) + **ratchet** (divergence check).

- App/route registry with a divergence check across `APP_DIRS`/manifest/HTML/baselines (`app-slug-parallel-registries`, 83).
- Catalog coverage invariant (`labs-catalog-coverage-invariant`, 58).
- Registry-driven icon-chrome + first-paint-CLS smokes replacing per-route enumeration (`icon-fouc-…-registry-drift` 68, `first-paint-cls-guard` 70).
- Baseline platform-stamping + Docker-only regen (Class C tail).

### Wave 3 — Promote single-surface invariants to all-surface contracts _(2–3 weeks; medium)_

Mechanism: **ratchet** (enumerate-all-surfaces test) + **guidance** (shared primitives new surfaces inherit). This is Class A end-to-end.

- `MergePolicy` per-entity map + keys-equal fixture test for all 6 Drive apps (80).
- `usePlaybackGeneration` shared hook + generation-token enumerator (80).
- VexFlow music-font-gate enumerator across all 4 notation surfaces (80).
- Drive guard-parity **runtime** contract test parametrized over every app (74); symmetric push-side "filled beats empty" guard (62); entity-scoped tombstone keys + shared `trashableRootIds` (30/30).
- Data-loss coverage-manifest guardrail (#3) lands here — it's the measure this wave's contracts report into.
- E2e allowlist/testid lint + nav ESLint rule (Class D, 64/63).

### Wave 4 — Decompositions & upgrades, held by Wave 1's ratchet _(ongoing; large)_

Mechanism: **guidance** (`COMPONENT_DECOMPOSITION_PATTERN.md`) enforced by the Wave-1 size ratchet so gains can't erode.

- VexFlowRenderer → pure `renderDrumScore` helper (#5, unblocked once `max-lines-per-function` is on).
- StanzaWorkspace / SessionScreen named splits — required before their next feature PR because the ratchet pins their ceilings.
- Encore dedup + fork migration (#7); split `shared/music` into cycle-free `model` vs `engine` layers with an import-direction rule (`shared-music-scc-god-module`, 61); migrate Stanza's 825-line bespoke Drive hook onto the shared factory (`stanza-drive-backup-factory-migration`, 33).

### Wave 5 — Make guidance self-checking _(days; small)_

Mechanism: **codification + measure** — closes the loop so the _rules_ themselves can't rot.

- Guidance-eval 90-day CI gate; AGENT_INVARIANTS `enforcement-kind` tagging + prose-only ratchet; doc-link citation validation (#8).
- Node pin authoritative + self-checking (`node-toolchain-pin-drift`, 50); flake-registry deadline enforcement, replacing blanket `--retry=1` with teardown-scoped retry (`ci-blanket-vitest-retry-masks-flakes`, 58).

---

## 4. Continuous-evaluation cadence

Add a new section to `docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` — **§ Standing regression-pattern review + tech-debt tournament** — so this exercise becomes a recurring balancing loop, not a one-off. It generalizes the doc's existing "codify on second occurrence" (CPI:91) and gives `TECH_DEBT_ROADMAP.md:37`'s "skipped twice" trigger a real signal.

**When it runs (cadence + trigger):**

- **Scheduled:** quarterly (aligns with the guidance-eval 90-day gate from Wave 5, so both fire together).
- **Triggered early** by any of: (a) the same root-cause class appears a **3rd** time across sessions (the codify-on-second rule handles the 2nd; the 3rd means the point-fix failed and a _class-level_ ratchet is owed); (b) a roadmap/backlog row is deferred **twice**; (c) a data-loss or critical-severity regression ships to `main`.

**Who runs it:** a workflow subagent exactly like this one — three roles: _regression archaeologist_ (mines git history + `FLAKY_TEST_REGISTRY.md` + incident PRs for recurring classes), _tech-debt tournament judges_ (score debt through the lenses used here — architecture-coupling, complexity, type-safety, duplication, dead-code, test-health, guidance-doc, dependency-toolchain), and a _chair_ (dedupes, ranks, awards, writes the plan). It runs read-only and produces structured findings; a human owns which winners land.

**What it must output (all four, or it didn't run):**

1. **Ranked confirmed-findings JSON** — every claim grounded in `path:line` or commit sha (no speculation), scored, deduped, lens-tagged — the input format this plan consumed.
2. **New root-cause labels** proposed for the canonical list (this round: `single-surface-guard`, `parallel-registry-drift`) — added only when several future bugs would share them (CPI:79).
3. **A waved plan** mapping each winner to a QUALITY_SYSTEM.md mechanism (measure/ratchet/guidance/codification), so every accepted item lands as a _failing gate_, not a backlog row.
4. **Baseline/roadmap delta** — new or updated ratchet baselines committed, `TECH_DEBT_ROADMAP.md` rows opened/closed, deferrals recorded in `PROCESS_BACKLOG.md`. The grand-prize item must land (or be scheduled) in the same cycle.

**Why it compounds:** the reinforcing loop in QUALITY_SYSTEM.md raises the floor one session at a time; this cadence audits _whether the floor actually rose_ — catching the failure mode that dominates this very tournament, where a fix was applied to one surface (or written as prose) and the class kept biting everywhere else. Making the review itself a scheduled, output-gated workflow is what stops "we'll ratchet it later" from being the permanent state.

---

### Referenced source files (grounding, all under the repo root)

`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` (root-cause classes §30, codify-on-second §91), `docs/QUALITY_SYSTEM.md` (attribute matrix §43, anti-patterns §98), `scripts/check-jscpd-ratchet.mjs` + `docs/jscpd-baseline.json`, `scripts/check-css-important.mjs` + `scripts/css-important-baseline.json`, `scripts/check-doc-links.mjs`, `scripts/validate-agent-docs.sh`, `scripts/render-labs-catalog.mjs`, `scripts/validate-knip-ignore.mjs`, `src/shared/sharedModuleCycles.test.ts`, `src/shared/sharedUiReuse.test.ts`, `src/shared/test/e2eSelectorGuardrails.test.ts`, `src/shared/audio/platform/audioPatternRegistry.test.ts`.
