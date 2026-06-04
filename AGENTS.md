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
9. [`.cursor/rules/README.md`](.cursor/rules/README.md) — scoped Cursor rules.
10. [`.cursor/skills/README.md`](.cursor/skills/README.md) — repo workflow skills.

### Nested `AGENTS.md`

[`src/encore/`](src/encore/AGENTS.md) · [`src/stanza/`](src/stanza/AGENTS.md) · [`src/shared/`](src/shared/AGENTS.md) · [`src/words/`](src/words/AGENTS.md) · [`src/drums/`](src/drums/AGENTS.md) · [`src/piano/`](src/piano/AGENTS.md) · [`src/chords/`](src/chords/AGENTS.md) · [`src/cats/`](src/cats/AGENTS.md) · [`src/scales/`](src/scales/AGENTS.md)

Apps without nested `AGENTS.md` → app `README.md` + this file.

## Agent precedence

When instructions conflict, resolve in this order:

1. **Explicit user chat** in the current session (unless they say “follow repo policy”).
2. **Cursor user rules** and **skills** (repo [`.cursor/skills/`](.cursor/skills/README.md) + user-installed skills — read the skill when the task matches).
3. **Nearest `AGENTS.md`** (app or `src/shared/`, then root) + matching **`.cursor/rules/*.mdc`** for open/edited paths.
4. **`src/<app>/README.md`** and app `DEVELOPMENT.md` / `LAYOUT.md`.
5. **`DEVELOPMENT.md`**, **`docs/adr/`**, **`STYLE_GUIDE.md`**.

Enforced config (CI, ESLint, guardrail tests) overrides prose in any doc. See [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md).

Presubmit before done: [`.cursor/rules/pre-commit-checks.mdc`](.cursor/rules/pre-commit-checks.mdc) (canonical; do not duplicate steps here).

## Task routing

| If you are touching…                               | Read first                                                                                                                                                 | Skill                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Any app feature                                    | `src/<app>/README.md` (+ app `AGENTS.md` if present)                                                                                                       | —                              |
| **New UI control / form field**                    | Search `/ui/` + `src/ui/generatedSharedCatalog.ts`; [`SHARED_UI_CONVENTIONS.md`](src/shared/SHARED_UI_CONVENTIONS.md); `.cursor/rules/shared-ui-first.mdc` | —                              |
| New/changed app shell / `index.html`               | `src/shared/templates/app-index.starter.html`, `spaGuardrails.test.ts`, `.cursor/rules/app-entry-html.mdc`                                                 | —                              |
| Shared UI, popovers, playback pickers              | `SHARED_UI_CONVENTIONS.md`, `/ui/` catalog, `.cursor/rules/playback-ui-regressions.mdc`                                                                    | —                              |
| Playback hooks, notation, VexFlow bugs             | `PLAYBACK_HOOK_PATTERN.md`, `PLAYBACK_RENDERING_AUDIT.md`                                                                                                  | `labs-playback-bugfix`         |
| Encore (library, originals, sync)                  | `src/encore/AGENTS.md`, `src/encore/README.md`                                                                                                             | —                              |
| Encore Originals chord paint                       | `originals/DEVELOPMENT.md`, `.cursor/rules/encore-originals-chord-paint.mdc`                                                                               | —                              |
| Stanza viewer layout                               | `src/stanza/LAYOUT.md`, `.cursor/rules/stanza-viewer-layout.mdc`                                                                                           | —                              |
| Workbench / multi-panel layout                     | `src/shared/layout/README.md`, `app-main.starter.tsx`                                                                                                      | —                              |
| Tempo analysis / optional Stanza Analyze           | `src/stanza/ANALYZE.md`, `src/shared/beat/TEST_MATRIX.md`, `.cursor/rules/beat-analysis-scope.mdc`                                                         | —                              |
| User-visible copy                                  | `docs/USER_COPY_STYLE.md` (+ app `COPY_STYLE.md`)                                                                                                          | —                              |
| Pitch visuals                                      | `src/pitch/DESIGN.md`                                                                                                                                      | —                              |
| Rhythm presets                                     | `presetIntegrity.test.ts` after editing `RHYTHM_DATABASE`                                                                                                  | `labs-rhythm-preset`           |
| URL param sync / shareable links                   | [`docs/URL_STATE_PATTERN.md`](docs/URL_STATE_PATTERN.md)                                                                                                   | `labs-url-state`               |
| New micro-app / app shell                          | `app-index.starter.html`, `spaGuardrails.test.ts`                                                                                                          | `labs-new-micro-app`           |
| Drive backup / conflict UX                         | `SHARED_UI_CONVENTIONS.md` § Drive                                                                                                                         | `labs-drive-backup`            |
| Dependency toolchain upgrade                       | [`docs/DEPENDENCY_UPGRADE_PLAN.md`](docs/DEPENDENCY_UPGRADE_PLAN.md)                                                                                       | `labs-dependency-upgrade`      |
| Mid-refactor handoff                               | [`DEVELOPMENT.md`](DEVELOPMENT.md) § Iteration handoff                                                                                                     | `labs-iteration-handoff`       |
| Material architecture (routing, OAuth, boundaries) | `docs/adr/README.md`, `.cursor/rules/architecture-decisions.mdc`                                                                                           | `labs-write-adr`               |
| Regression / visual baselines                      | `docs/REGRESSION_WORKFLOW.md`                                                                                                                              | `labs-visual-regression`       |
| GitHub Actions / CI reliability                    | [`docs/CI_RELIABILITY.md`](docs/CI_RELIABILITY.md)                                                                                                         | `labs-babysit-pr`              |
| Large component / App.tsx refactor                 | `docs/COMPONENT_DECOMPOSITION_PATTERN.md`                                                                                                                  | `labs-component-decomposition` |
| PR babysitting / merge-ready                       | [`docs/PR_WORKFLOW.md`](docs/PR_WORKFLOW.md)                                                                                                               | `labs-babysit-pr`              |
| Split work into multiple PRs                       | [`docs/PR_WORKFLOW.md`](docs/PR_WORKFLOW.md) § Splitting                                                                                                   | `labs-split-to-prs`            |
| Session retrospective / codify learnings           | `docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`                                                                                                                   | `labs-session-retrospective`   |

Commands quick reference: root [`README.md`](README.md) and `package.json` scripts.

## Boundaries

### Always (do without asking)

- Respect **import boundaries** (`src/shared/**` only for cross-app reuse).
- Use **shared UI primitives** before app-local copies.
- **Question-only / review-only tasks:** minimal diff—do not refactor or “improve” unrelated code.
- Read the **nearest app README** before editing an unfamiliar app.

### Ask first

- **Git commit**, **push**, or **open a PR** (unless the user explicitly requested it).
- **Visual baseline updates** (`e2e/visual/*-snapshots/`) — skill `labs-visual-regression`.
- **New ADR** or material architecture change — skill `labs-write-adr`.
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

**Repo skills** (version-controlled): [`.cursor/skills/README.md`](.cursor/skills/README.md) — read the full `SKILL.md` when the task routing table or user request matches.

**User-installed skills** (Cursor global): `babysit`, `split-to-prs`, `create-rule`, `create-skill`, etc. Prefer repo skills (`labs-babysit-pr`, `labs-split-to-prs`) when both exist — repo skills include Labs-specific gates.

When a task matches a skill, **read and follow it first** before improvising a workflow.

## Editing Checklist

### Preflight (UI or user-visible copy)

- [ ] Searched **`/ui/`** catalog or `src/ui/generatedSharedCatalog.ts` for an existing primitive
- [ ] Checked **`SHARED_UI_CONVENTIONS.md`** for this control type
- [ ] User-visible strings follow **`docs/USER_COPY_STYLE.md`** (+ app `COPY_STYLE.md` when present)

### Before declaring a task done

- [ ] Presubmit clean (see `pre-commit-checks.mdc`)
- [ ] New shared primitive → `SHARED_UI_CONVENTIONS.md` + `/ui/` demo
- [ ] New app directory → `importBoundaries.test.ts` + `check-import-boundaries.mjs`
- [ ] Visual baselines updated **intentionally** only (skill `labs-visual-regression`)
- [ ] Material architecture → ADR when practical (skill `labs-write-adr`)
- [ ] Substantial session → offer retrospective (skill `labs-session-retrospective`)

## Repo Map

```text
src/<app>/       — micro-apps (index.html + main.tsx + README.md)
src/shared/      — cross-app code (see src/shared/AGENTS.md)
src/ui/          — shared UI catalog
docs/            — policy, ADRs, regression workflow
e2e/             — cross-app Playwright specs
.cursor/rules/   — scoped agent rules (path-triggered)
.cursor/skills/  — repo workflow skills (task-triggered)
```
