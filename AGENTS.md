# AGENTS.md

Instructions for AI coding assistants (Cursor, Claude, Codex, Gemini, etc.). [`GEMINI.md`](GEMINI.md) redirects here for backwards compatibility.

## Start Here

1. `README.md` — repo layout and quick start.
2. **`src/<app>/README.md`** — always read the app you are editing (nested agent context).
3. `DEVELOPMENT.md` — architecture, guardrails, policy (**authoritative for humans**).
4. `STYLE_GUIDE.md` — TypeScript + UI/a11y conventions.
5. `docs/SOURCE_OF_TRUTH.md` — doc precedence + [agent precedence](#agent-precedence).
6. `docs/DOCUMENTATION_STRATEGY.md` — where to put new docs.
7. [`.cursor/rules/README.md`](.cursor/rules/README.md) — scoped Cursor rules index.
8. Nested **`AGENTS.md`** when present: [`src/encore/`](src/encore/AGENTS.md), [`src/stanza/`](src/stanza/AGENTS.md), [`src/shared/`](src/shared/AGENTS.md).

## Agent precedence

When instructions conflict, resolve in this order:

1. **Explicit user chat** in the current session (unless they say “follow repo policy”).
2. **Cursor user rules** and installed **skills** (read the skill file when the task matches).
3. **Nearest `AGENTS.md`** (app or `src/shared/`, then root) + matching **`.cursor/rules/*.mdc`** for open/edited paths.
4. **`src/<app>/README.md`** and app `DEVELOPMENT.md` / `LAYOUT.md`.
5. **`DEVELOPMENT.md`**, **`docs/adr/`**, **`STYLE_GUIDE.md`**.

Enforced config (CI, ESLint, guardrail tests) overrides prose in any doc. See [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md).

## Task routing

| If you are touching…                               | Read first                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Any app feature                                    | `src/<app>/README.md` (+ app `AGENTS.md` if present)                                                       |
| New/changed app shell / `index.html`               | `src/shared/templates/app-index.starter.html`, `spaGuardrails.test.ts`, `.cursor/rules/app-entry-html.mdc` |
| Shared UI, popovers, playback pickers              | `SHARED_UI_CONVENTIONS.md`, `/ui/` catalog, `.cursor/rules/playback-ui-regressions.mdc`                    |
| Playback hooks, notation, VexFlow                  | `PLAYBACK_HOOK_PATTERN.md`, `PLAYBACK_RENDERING_AUDIT.md`                                                  |
| Encore (library, originals, sync)                  | `src/encore/AGENTS.md`, `src/encore/README.md`                                                             |
| Encore Originals chord paint                       | `originals/DEVELOPMENT.md`, `.cursor/rules/encore-originals-chord-paint.mdc`                               |
| Stanza viewer layout                               | `src/stanza/LAYOUT.md`, `.cursor/rules/stanza-viewer-layout.mdc`                                           |
| Workbench / multi-panel layout                     | `src/shared/layout/README.md`, `app-main.starter.tsx`                                                      |
| Beat analysis / tempo                              | `src/beat/DEVELOPMENT.md`, `.cursor/rules/beat-analysis-scope.mdc`                                         |
| User-visible copy                                  | `docs/USER_COPY_STYLE.md` (+ app `COPY_STYLE.md`)                                                          |
| Pitch visuals                                      | `src/pitch/DESIGN.md`                                                                                      |
| Rhythm presets                                     | `presetIntegrity.test.ts` after editing `RHYTHM_DATABASE`                                                  |
| Material architecture (routing, OAuth, boundaries) | `docs/adr/README.md`, `.cursor/rules/architecture-decisions.mdc`                                           |
| Regression / visual baselines                      | `docs/REGRESSION_WORKFLOW.md`                                                                              |

## Boundaries

### Always (do without asking)

- Run **`npm run presubmit`** before declaring a task done or suggesting a commit.
- Respect **import boundaries** (`src/shared/**` only for cross-app reuse).
- Use **shared UI primitives** before app-local copies.
- **Question-only / review-only tasks:** minimal diff—do not refactor or “improve” unrelated code.
- Read the **nearest app README** before editing an unfamiliar app.

### Ask first

- **Git commit**, **push**, or **open a PR** (unless the user explicitly requested it).
- **Visual baseline updates** (`e2e/visual/*-snapshots/`).
- **New ADR** or material architecture change.
- Expanding scope beyond the user’s request.
- **Codifying process improvements** into rules/docs (offer first; implement when the user agrees).

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

When the user’s task matches an installed Cursor skill (e.g. babysit PR, split-to-PRs, create-rule), **read and follow that skill file first** before improvising a workflow.

## Commands

| Command                                                   | Use when                                  |
| --------------------------------------------------------- | ----------------------------------------- |
| `npm run presubmit`                                       | Before done / before suggesting commit    |
| `npm run test:fast`                                       | Iterating on TS/tests (pre-commit subset) |
| `npm test`                                                | Full Vitest (CI parity)                   |
| `npm run test:e2e:smoke`                                  | Quick app shell smoke                     |
| `npx playwright test e2e/playback-ui-regressions.spec.ts` | Playback UI smokes                        |
| `npm run test:e2e:visual`                                 | Visual regression verify                  |
| `npm run test:e2e:visual:update`                          | Intentional baseline refresh              |
| `npm run test:regression`                                 | Audio + visual combined                   |
| `npm run knip`                                            | After adding/removing exports or files    |

```bash
npm run dev            # vite dev server (5173)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
npx playwright test    # all E2E (install browsers first)
```

## Handoff types (do not conflate)

| Name                      | When                                           | Doc                                  |
| ------------------------- | ---------------------------------------------- | ------------------------------------ |
| **Iteration handoff**     | Stopping mid-refactor; next person needs state | `DEVELOPMENT.md` § Iteration handoff |
| **Process retrospective** | Session complete; improve how we work          | `CONTINUOUS_PROCESS_IMPROVEMENT.md`  |
| **Bug-fix handoff**       | Fixed a regression; record symptom class       | PR template § Bug-fix handoff        |

## Editing Checklist

Before declaring a task done:

- [ ] `npm run presubmit` clean
- [ ] New shared primitive → `SHARED_UI_CONVENTIONS.md` + `/ui/` demo
- [ ] New app directory → `importBoundaries.test.ts` + `check-import-boundaries.mjs`
- [ ] Visual baselines updated **intentionally** only
- [ ] Material architecture → ADR when practical

## Continuous process improvement

After substantial sessions, **proactively** offer a brief retrospective (symptom → root cause class → durable fix). See [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](docs/CONTINUOUS_PROCESS_IMPROVEMENT.md). Fill PR **Process improvements** when codifying.

## Large Refactors

Follow [`docs/COMPONENT_DECOMPOSITION_PATTERN.md`](docs/COMPONENT_DECOMPOSITION_PATTERN.md).

## Repo Map

```text
src/<app>/     — micro-apps (index.html + main.tsx + README.md)
src/shared/    — cross-app code (see src/shared/AGENTS.md)
src/ui/        — shared UI catalog
docs/          — policy, ADRs, regression workflow
e2e/           — cross-app Playwright specs
.cursor/rules/ — scoped agent rules (see README.md)
```
