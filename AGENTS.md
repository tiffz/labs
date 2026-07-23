# AGENTS.md

Instructions for AI coding assistants (Cursor, Claude, Codex, Gemini, etc.). [`GEMINI.md`](GEMINI.md) redirects here for backwards compatibility.

## Start Here

### Tier A — every task

1. **`src/<app>/README.md`** — read the app you are editing (+ nested **`AGENTS.md`** when present).
2. **Task routing** (table below) — open the matching doc or **skill**.
3. **Editing checklist** — before declaring done.

### Tier B — when the task touches policy or unfamiliar subsystems

4. `DEVELOPMENT.md` — architecture, guardrails (**authoritative for humans**).
5. `STYLE_GUIDE.md` — TypeScript + UI/a11y + UX parallelism.
6. `docs/SOURCE_OF_TRUTH.md` — doc precedence + [agent precedence](#agent-precedence).
7. `docs/DOCUMENTATION_STRATEGY.md` — where to put new docs + [agent context map](docs/DOCUMENTATION_STRATEGY.md#agent-context-map).
8. [`docs/DEVELOPMENT_AGENT_INDEX.md`](docs/DEVELOPMENT_AGENT_INDEX.md) — Tier B section pointers (read one section, not all of `DEVELOPMENT.md`).
9. [`.agents/rules/README.md`](.agents/rules/README.md) — scoped agent rules.
10. [`.agents/skills/README.md`](.agents/skills/README.md) — repo workflow skills.

### Nested `AGENTS.md`

[`src/encore/`](src/encore/AGENTS.md) · [`src/gesture/`](src/gesture/AGENTS.md) · [`src/lyrefly/`](src/lyrefly/AGENTS.md) · [`src/scrapboard/`](src/scrapboard/AGENTS.md) · [`src/stanza/`](src/stanza/AGENTS.md) · [`src/shared/`](src/shared/AGENTS.md) · [`src/words/`](src/words/AGENTS.md) · [`src/drums/`](src/drums/AGENTS.md) · [`src/chords/`](src/chords/AGENTS.md) · [`src/cats/`](src/cats/AGENTS.md) · [`src/scales/`](src/scales/AGENTS.md) · [`src/sight/`](src/sight/AGENTS.md) · [`src/zinebox/`](src/zinebox/AGENTS.md) · [`src/muscle/`](src/muscle/AGENTS.md) · [`src/midi/`](src/midi/AGENTS.md)

Apps without nested `AGENTS.md` → app `README.md` + this file.

## Agent precedence

When instructions conflict, resolve in this order:

1. **Explicit user chat** in the current session (unless they say “follow repo policy”).
2. **Cursor user rules** and **skills** (repo [`.agents/skills/`](.agents/skills/README.md) + user-installed skills — read the skill when the task matches).
3. **Nearest `AGENTS.md`** (app or `src/shared/`, then root) + matching **`.agents/rules/*.md`** for open/edited paths.
4. **`src/<app>/README.md`** and app `DEVELOPMENT.md` / `LAYOUT.md`.
5. **`DEVELOPMENT.md`**, **`docs/adr/`**, **`STYLE_GUIDE.md`**.

Enforced config (CI, ESLint, guardrail tests) overrides prose in any doc. See [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md).

Presubmit before done: [`.agents/rules/pre-commit-checks.md`](.agents/rules/pre-commit-checks.md) (canonical; do not duplicate steps here).

## Task routing

**Doc cost:** **A** = read every task · **B** = read when row matches · **C** = link only unless implementing

| If you are touching…                                   | Read first (cost)                                                                                                                                                                                                                                                               | Skill                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Any app feature                                        | `src/<app>/README.md` (+ app `AGENTS.md` if present) **(A)**                                                                                                                                                                                                                    | —                              |
| **New UI / layout / upload-sync UX**                   | [`docs/UX_AGENT_GUIDE.md`](docs/UX_AGENT_GUIDE.md), [`docs/RESPONSIVE_DESIGN.md`](docs/RESPONSIVE_DESIGN.md), app `DESIGN.md`, `STYLE_GUIDE.md` **(B)**; `.agents/rules/ux-agent-guide.md`, `.agents/rules/responsive-design.md`                                                | `labs-ux-journey`              |
| **Selection tiers (toggles, chips, popover interior)** | [`docs/SELECTION_VISUAL_HIERARCHY.md`](docs/SELECTION_VISUAL_HIERARCHY.md), `THEMING_DECISIONS.md` **(B)**; `.agents/rules/selection-visual-hierarchy.md`                                                                                                                       | —                              |
| **Focus ring theming (keyboard a11y + CSS tokens)**    | [`docs/FOCUS_THEMING.md`](docs/FOCUS_THEMING.md), [`docs/A11Y_MENU_PATTERNS.md`](docs/A11Y_MENU_PATTERNS.md) **(B)**; `.agents/rules/focus-theming.md`                                                                                                                          | —                              |
| **New UI control / form field**                        | Search `/ui/` + `src/ui/generatedSharedCatalog.ts`; [`SHARED_UI_CONVENTIONS.md`](src/shared/SHARED_UI_CONVENTIONS.md) (§ First-class vs portable); `.agents/rules/shared-ui-first.md` **(B)** — check app README **Intentional diversions** before replacing app-local controls | —                              |
| New/changed app shell / `index.html`                   | `src/shared/templates/app-index.starter.html`, `spaGuardrails.test.ts`, `.agents/rules/app-entry-html.md`                                                                                                                                                                       | —                              |
| Shared UI, popovers, playback pickers                  | `SHARED_UI_CONVENTIONS.md`, `/ui/` catalog, `.agents/rules/playback-ui-regressions.md`                                                                                                                                                                                          | —                              |
| Playback hooks, notation, VexFlow bugs                 | `PLAYBACK_HOOK_PATTERN.md`, `PLAYBACK_RENDERING_AUDIT.md`                                                                                                                                                                                                                       | `labs-playback-bugfix`         |
| **Playback / metronome / drum audio**                  | [`docs/SHARED_AUDIO_PLATFORM.md`](docs/SHARED_AUDIO_PLATFORM.md), [`src/shared/audio/platform/`](src/shared/audio/platform/) **(B)**                                                                                                                                            | —                              |
| Encore (library, originals, sync)                      | `src/encore/AGENTS.md`, `src/encore/README.md`                                                                                                                                                                                                                                  | —                              |
| Scrapboard (cast, mockups, Wikimedia)                  | `src/scrapboard/AGENTS.md`, `src/scrapboard/README.md` **(A)**                                                                                                                                                                                                                  | —                              |
| Encore performance log / video UX                      | [`src/encore/PERFORMANCE_UX.md`](src/encore/PERFORMANCE_UX.md), `.agents/rules/encore-performance-ux.md`, [`docs/design-explorations/performance-detail-page.md`](docs/design-explorations/performance-detail-page.md)                                                          | —                              |
| Encore guest share / snapshot publish (P0)             | [`src/encore/README.md`](src/encore/README.md) § Browser API key + BFF, [`src/encore/CUJs.md`](src/encore/CUJs.md) CUJ-006, `e2e/smoke/encore-guest-share.spec.ts` **(B)**                                                                                                      | —                              |
| Encore Originals chord paint                           | `originals/DEVELOPMENT.md`, `.agents/rules/encore-originals-chord-paint.md`                                                                                                                                                                                                     | —                              |
| Stanza viewer layout                                   | `src/stanza/LAYOUT.md`, `.agents/rules/stanza-viewer-layout.md`                                                                                                                                                                                                                 | —                              |
| Workbench / multi-panel layout                         | `src/shared/layout/README.md`, `app-main.starter.tsx`                                                                                                                                                                                                                           | —                              |
| Tempo analysis / optional Stanza Analyze               | `src/stanza/ANALYZE.md`, `src/shared/beat/TEST_MATRIX.md`, `.agents/rules/beat-analysis-scope.md`                                                                                                                                                                               | —                              |
| User-visible copy                                      | `docs/USER_COPY_STYLE.md` (+ app `COPY_STYLE.md`)                                                                                                                                                                                                                               | —                              |
| Pitch visuals                                          | `src/pitch/DESIGN.md`                                                                                                                                                                                                                                                           | —                              |
| Rhythm presets                                         | `presetIntegrity.test.ts` after editing `RHYTHM_DATABASE`                                                                                                                                                                                                                       | `labs-rhythm-preset`           |
| URL param sync / shareable links                       | [`docs/URL_STATE_PATTERN.md`](docs/URL_STATE_PATTERN.md)                                                                                                                                                                                                                        | `labs-url-state`               |
| In-app SPA links (native href, modifier+click)         | [`docs/adr/0017-spa-native-link-navigation.md`](docs/adr/0017-spa-native-link-navigation.md), [`SHARED_UI_CONVENTIONS.md`](src/shared/SHARED_UI_CONVENTIONS.md) § In-app navigation links **(B)**                                                                               | —                              |
| New micro-app / app shell                              | `app-index.starter.html`, `spaGuardrails.test.ts`, `check:app-quality`                                                                                                                                                                                                          | `labs-new-micro-app`           |
| App-level undo (edit / CRUD apps)                      | [`src/shared/undo/README.md`](src/shared/undo/README.md) — `LabsUndoProvider`, `useLabsUndo`; keyboard-first (no header buttons) **(B)**                                                                                                                                        | —                              |
| Keyboard shortcuts help (`Ctrl/Cmd + ?`)               | [`src/shared/keyboardShortcuts/index.ts`](src/shared/keyboardShortcuts/index.ts) — `LabsKeyboardShortcutsDialog`, `useLabsKeyboardShortcutsHelp`, app `*KeyboardShortcutSections()` **(B)**                                                                                     | —                              |
| Drive backup / conflict UX                             | [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md), [`docs/LOCAL_FIRST_SYNC.md`](docs/LOCAL_FIRST_SYNC.md), [ADR 0020](docs/adr/0020-silent-union-sync-row-conflicts-only.md), `SHARED_UI_CONVENTIONS.md` § Drive                             | `labs-drive-backup`            |
| Dependency toolchain upgrade                           | [`docs/DEPENDENCY_UPGRADE_PLAN.md`](docs/DEPENDENCY_UPGRADE_PLAN.md)                                                                                                                                                                                                            | `labs-dependency-upgrade`      |
| Mid-refactor handoff                                   | [`DEVELOPMENT.md`](DEVELOPMENT.md) § Iteration handoff                                                                                                                                                                                                                          | `labs-iteration-handoff`       |
| Material architecture (routing, OAuth, boundaries)     | `docs/adr/README.md`, `.agents/rules/architecture-decisions.md`                                                                                                                                                                                                                 | `labs-write-adr`               |
| Regression / visual baselines                          | [`docs/VISUAL_REGRESSION_AGENT.md`](docs/VISUAL_REGRESSION_AGENT.md), `docs/REGRESSION_WORKFLOW.md`                                                                                                                                                                             | `labs-visual-regression`       |
| Screenshot diff triage (CI visual failure)             | [`docs/VISUAL_JUDGE_RUBRIC.md`](docs/VISUAL_JUDGE_RUBRIC.md) **(B)**                                                                                                                                                                                                            | `labs-visual-judge`            |
| Interaction perf / CUJ benchmarks                      | [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md), [`docs/CRITICAL_USER_JOURNEYS.md`](docs/CRITICAL_USER_JOURNEYS.md), app `CUJs.md`                                                                                                                                                 | `labs-performance`             |
| Lighthouse / load audits (advisory)                    | [`docs/LIGHTHOUSE_AUDIT.md`](docs/LIGHTHOUSE_AUDIT.md) **(B)**                                                                                                                                                                                                                  | —                              |
| In-app UI design theme iterations / preview picker     | app `README.md` + [`labs-ui-design-variations`](.agents/skills/labs-ui-design-variations/SKILL.md)                                                                                                                                                                              | `labs-ui-design-variations`    |
| The Gesture Room UI / Linen theme                      | [`src/gesture/DESIGN.md`](src/gesture/DESIGN.md), `.agents/rules/gesture-linen-design.md`                                                                                                                                                                                       | —                              |
| Gesture media / preview / session cache                | [`docs/GESTURE_MEDIA_STABILITY.md`](docs/GESTURE_MEDIA_STABILITY.md), [`src/gesture/AGENTS.md`](src/gesture/AGENTS.md) § Media tiers, `.agents/rules/gesture-media-tiers.md`                                                                                                    | —                              |
| GitHub Actions / CI reliability                        | [`docs/CI_RELIABILITY.md`](docs/CI_RELIABILITY.md)                                                                                                                                                                                                                              | `labs-babysit-pr`              |
| Large component / App.tsx refactor                     | `docs/COMPONENT_DECOMPOSITION_PATTERN.md`                                                                                                                                                                                                                                       | `labs-component-decomposition` |
| PR babysitting / merge-ready                           | [`docs/PR_WORKFLOW.md`](docs/PR_WORKFLOW.md)                                                                                                                                                                                                                                    | `labs-babysit-pr`              |
| **Merging a branch to `main` / pre-merge review**      | [`.agents/skills/labs-local-review/SKILL.md`](.agents/skills/labs-local-review/SKILL.md) **(B)**                                                                                                                                                                                | `labs-local-review`            |
| **Major new product / feature proposal**               | [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md), [ADR 0024](docs/adr/0024-major-change-ux-qa-review-gates.md) **(B)** — audience, scope, portfolio fit                                                                                                                       | `labs-pm-review`               |
| **Technical design of a major initiative**             | [ADR 0024](docs/adr/0024-major-change-ux-qa-review-gates.md), `DEVELOPMENT.md` **(B)** — decisions, reversibility, data model, failure modes                                                                                                                                    | `labs-architecture-review`     |
| **Major UX change (pre-merge design audit)**           | [`docs/UX_AGENT_GUIDE.md`](docs/UX_AGENT_GUIDE.md), [`docs/VISUAL_JUDGE_RUBRIC.md`](docs/VISUAL_JUDGE_RUBRIC.md) **(B)** — rendered-UI critique                                                                                                                                 | `labs-ux-review`               |
| **Major feature QA (pre-merge stress test)**           | [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) § Mandatory feature-test matrix **(B)** — bugs become regression tests                                                                                                                                                         | `labs-qa-review`               |
| **App quality tier / how much rigor**                  | [`docs/APP_QUALITY_TIERS.md`](docs/APP_QUALITY_TIERS.md), `docs/app-quality-tiers.json` **(B)** — usage × criticality, not public listing                                                                                                                                       | —                              |
| **Editing agent guidance (subagent/skill/rule)**       | [`.agents/rules/agentic-guidance-review.md`](.agents/rules/agentic-guidance-review.md) **(B)** — regenerate + audit for agentic best practices                                                                                                                                  | `labs-agentic-review`          |
| **Finding critical architecture bugs / bug clusters**  | `.agents/skills/labs-architecture-audit/references/fragility-signals.md` **(B)** — fragility signals; escalate a bug cluster to a systemic review                                                                                                                               | `labs-architecture-audit`      |
| Split work into multiple PRs                           | [`docs/PR_WORKFLOW.md`](docs/PR_WORKFLOW.md) § Splitting                                                                                                                                                                                                                        | `labs-split-to-prs`            |
| Quality system / positive feedback loop                | [`docs/QUALITY_SYSTEM.md`](docs/QUALITY_SYSTEM.md) **(B)** — attribute × ratchet matrix; how learnings compound                                                                                                                                                                 | —                              |
| Session retrospective / codify learnings               | [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](docs/CONTINUOUS_PROCESS_IMPROVEMENT.md), [`docs/AGENT_INVARIANTS.md`](docs/AGENT_INVARIANTS.md) **(B)**                                                                                                                              | `labs-session-retrospective`   |
| Content-heavy / curriculum / generator apps            | [`docs/CONTENT_ACCURACY.md`](docs/CONTENT_ACCURACY.md) **(B)**; `.agents/rules/content-integrity.md`                                                                                                                                                                            | —                              |
| Agent invariants index                                 | [`docs/AGENT_INVARIANTS.md`](docs/AGENT_INVARIANTS.md) **(C)**                                                                                                                                                                                                                  | —                              |
| E2e smoke / dev fixtures                               | [`docs/E2E_SMOKE_CONVENTIONS.md`](docs/E2E_SMOKE_CONVENTIONS.md) **(B)**                                                                                                                                                                                                        | `labs-e2e-smoke`               |
| Muscle Memory Z-Anatomy GLB export / skin gaps         | [`tools/muscle-anatomy/README.md`](tools/muscle-anatomy/README.md), [`src/muscle/AGENTS.md`](src/muscle/AGENTS.md) **(B)**                                                                                                                                                      | `labs-muscle-anatomy-export`   |
| CI path scoping / faster local checks                  | [`docs/CI_PATH_SCOPING.md`](docs/CI_PATH_SCOPING.md) **(C)**                                                                                                                                                                                                                    | —                              |
| Flaky Vitest / pre-commit timeouts                     | [`docs/FLAKY_TESTS.md`](docs/FLAKY_TESTS.md), [`.agents/rules/flaky-tests.md`](.agents/rules/flaky-tests.md) **(B)**                                                                                                                                                            | —                              |
| Zine Box (library, reader, Drive import)               | `src/zinebox/README.md`, `src/zinebox/AGENTS.md`, `src/zinebox/CUJs.md` **(B)**                                                                                                                                                                                                 | —                              |
| Dexie / IndexedDB empty states                         | App `README.md` empty-library section; `docs/LOCAL_FIRST_SYNC.md` when sync-related **(B)**                                                                                                                                                                                     | —                              |
| Blocking jobs (long imports / sync)                    | `src/shared/jobs/LabsBlockingJobContext.tsx`, `labsBlockingJobGuardrails.test.ts` **(B)**                                                                                                                                                                                       | —                              |
| Google OAuth / session BFF                             | `docs/adr/` OAuth rows, `src/shared/google/` **(B)**                                                                                                                                                                                                                            | `labs-write-adr`               |

Commands quick reference: root [`README.md`](README.md) and `package.json` scripts.

## Boundaries

### Always (do without asking)

- Respect **import boundaries** (`src/shared/**` only for cross-app reuse).
- Use **shared UI primitives** before app-local copies.
- **Question-only / review-only tasks:** minimal diff—do not refactor or “improve” unrelated code.
- Read the **nearest app README** before editing an unfamiliar app.
- Always-on gates (full text in their rules): UX journey sketch ([`ux-journey-mandatory.md`](.agents/rules/ux-journey-mandatory.md)), feasibility assessment ([`feasibility-first.md`](.agents/rules/feasibility-first.md)), presubmit ([`pre-commit-checks.md`](.agents/rules/pre-commit-checks.md)), writing style ([`writing-style.md`](.agents/rules/writing-style.md)).

### Ask first

- **Git commit**, **push**, or **open a PR** (unless the user explicitly requested it).
- **Merge to `main`** — allowed only after the [`labs-local-review`](.agents/skills/labs-local-review/SKILL.md) gate is green (three reviewer subagents, findings verified, zero open blockers); rationale in [ADR 0023](docs/adr/0023-local-review-merge-gate.md). Without that gate, treat merge as ask-first.
- **Major changes** also run the lifecycle gates in [`major-change-review-gates.md`](.agents/rules/major-change-review-gates.md) ([ADR 0024](docs/adr/0024-major-change-ux-qa-review-gates.md)) — PM at proposal, architecture at design, UX and QA before merge — right-sized by the app's quality tier ([`docs/APP_QUALITY_TIERS.md`](docs/APP_QUALITY_TIERS.md)). `protected` apps (e.g. Encore, despite being unlisted) get full rigor; `experimental` apps move fast.
- **Visual baseline updates** (`e2e/visual/*-snapshots/`) — skill `labs-visual-regression`.
- **New ADR** or material architecture change — skill `labs-write-adr`.
- Expanding scope beyond the user’s request.
- **Codifying process improvements** into rules/docs when the user has not agreed — except retrospective **proposals** (always deliver) and **codify-on-second-occurrence** per [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](docs/CONTINUOUS_PROCESS_IMPROVEMENT.md).

### Never

- Cross-app imports (`src/<app-a>/` → `src/<app-b>/`).
- Disable guardrail tests to land a refactor.
- **`git commit --no-verify`**, **force-push to `main`**, or destructive git without explicit user request.
- Commit secrets (`.env`, tokens, credentials) or log OAuth tokens / PII.
- Silently regenerate visual baselines without review.
- Add new **`!important`** in CSS (`docs/CSS_IMPORTANT_AUDIT.md`).
- Reintroduce Pitch theme switchers or `data-pitch-concept` skins.

## Security

- Never commit `.env`, API keys, OAuth client secrets, or credential files.
- Labs debug mode (`?debug` / `?dev`) is **local dev only** — do not expose debug endpoints in production builds.
- Use **Copy bundle** in LabsDebugDock for assistant artifacts; there is no automatic browser→LLM pipe.

## Skills

**Repo skills** (version-controlled): [`.agents/skills/README.md`](.agents/skills/README.md) — read the full `SKILL.md` when the task routing table or user request matches.

**User-installed skills** (Cursor global): `babysit`, `split-to-prs`, `create-rule`, `create-skill`, etc. Prefer repo skills (`labs-babysit-pr`, `labs-split-to-prs`) when both exist — repo skills include Labs-specific gates.

When a task matches a skill, **read and follow it first** before improvising a workflow.

## Editing Checklist

### Preflight (UI or user-visible copy)

- [ ] **`labs-ux-journey`** — **journey sketch posted in chat before any UI code** (non-trivial tasks; rule `ux-journey-mandatory.md`)
- [ ] Searched **`/ui/`** catalog or `src/ui/generatedSharedCatalog.ts` for an existing primitive
- [ ] Checked **`SHARED_UI_CONVENTIONS.md`** for this control type
- [ ] User-visible strings follow **`docs/USER_COPY_STYLE.md`** (+ app `COPY_STYLE.md` when present)
- [ ] App **`DESIGN.md`** + tokens (no ad-hoc hex); see **`docs/UX_AGENT_GUIDE.md`**

### Before declaring a task done

See [`.agents/rules/pre-commit-checks.md`](.agents/rules/pre-commit-checks.md) for the full gate (presubmit, eslint on touched files, `presubmit:push` when shells/e2e change). Also:

- [ ] New shared primitive → `SHARED_UI_CONVENTIONS.md` + `/ui/` demo
- [ ] New grid-aligned audio, audio export, Drive sync/merge, or app-level undo feature → required tests per [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) § Mandatory feature-test matrix
- [ ] New app directory → `importBoundaries.test.ts` + `check-import-boundaries.mjs`
- [ ] New journey smoke → `labs-e2e-smoke` skill + `APP_SMOKE_SPECS` when applicable
- [ ] Interaction perf / CUJ → `src/<app>/CUJs.md` + smoke when fixing lag (`labs-performance`)
- [ ] Substantial session → deliver retrospective (`labs-session-retrospective`)

## Repo Map

```text
src/<app>/       — micro-apps (index.html + main.tsx + README.md)
src/shared/      — cross-app code (see src/shared/AGENTS.md)
src/ui/          — shared UI catalog
docs/            — policy, ADRs, regression workflow
e2e/             — cross-app Playwright specs
.agents/rules/   — scoped agent rules (path-triggered); source of truth
.agents/skills/  — repo workflow skills (task-triggered); source of truth
.cursor/, .claude/ — generated per-tool copies (npm run generate:agent-guidance); do not hand-edit
```
