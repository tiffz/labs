# Documentation strategy (Labs)

How we grow documentation without drift, duplication, or low-signal narrative. **Precedence when anything conflicts** still follows [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md); this file defines **where new material belongs** and **what to avoid**.

## Principles

1. **One canonical home per topic.** Other places link; they do not restate policy paragraphs.
2. **Prefer enforcement over prose.** If CI, ESLint, Vitest, or a script already encodes the rule, the doc should **point to the artifact** (file path + one sentence), not re-derive the rule in three paragraphs.
3. **Durable “why” and contracts; not play-by-play history.** Closed initiatives, old audits, and superseded plans belong in **git history**, an **ADR “Context”** section, or a clearly **archived** doc with a banner — not scattered through living guides.
4. **App docs stay local.** `src/<app>/README.md` (and optional `DESIGN.md`, `COPY_STYLE.md`, `ARCHITECTURE.md`) describe **that app’s behavior and constraints**. They must not redefine repo-wide policy (copy voice, import boundaries, SPA shell) — link to `DEVELOPMENT.md`, `STYLE_GUIDE.md`, or ADRs instead.
5. **Explorations ≠ policy.** `docs/design-explorations/` holds options and spikes. When a decision is made, **promote** to `docs/adr/` or `DEVELOPMENT.md` and **trim or archive** the exploration so readers are not pulled two ways.

## Canonical map (where to put new content)

| Kind of content                                                 | Canonical location                                                                   | Notes                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Cross-app policy, guardrails, CI behavior**                   | Root [`DEVELOPMENT.md`](../DEVELOPMENT.md)                                           | Keep aligned with workflows and hooks in the same PR when behavior changes.                                  |
| **Material architecture decision (alternatives, consequences)** | [`docs/adr/NNNN-title.md`](adr/README.md)                                            | Short, numbered; link from `DEVELOPMENT.md` when operators need a pointer.                                   |
| **TypeScript / UI / a11y editing conventions**                  | [`STYLE_GUIDE.md`](../STYLE_GUIDE.md)                                                | Includes JSDOM/media testing, lazy test timeouts, density patterns.                                          |
| **Default product copy voice**                                  | [`docs/USER_COPY_STYLE.md`](USER_COPY_STYLE.md)                                      | App `COPY_STYLE.md` = domain-only deltas.                                                                    |
| **Shared UI primitives and tokens**                             | [`src/shared/SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md)      | New shared components: document + `/ui/` demo per `AGENTS.md` checklist.                                     |
| **“Which doc wins?”**                                           | [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md)                                      | Update when introducing a new top-level policy file.                                                         |
| **AI assistant workflow**                                       | [`AGENTS.md`](../AGENTS.md)                                                          | Task lists, boundaries, task routing; **link** to policy instead of duplicating `DEVELOPMENT.md`.            |
| **Nested agent context (monorepo apps)**                        | `src/<app>/AGENTS.md` (+ app `README.md`)                                            | Encore, Stanza, shared, Words, Drums, Piano, Chords: see root `AGENTS.md` § Start Here.                      |
| **Cursor rules index**                                          | [`.cursor/rules/README.md`](../.cursor/rules/README.md)                              | Update when adding scoped rules.                                                                             |
| **Session retrospective / process improvement**                 | [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)        | Agent rule: `.cursor/rules/session-retrospective.mdc`. PR template § Process improvements.                   |
| **Onboarding, commands, repo map**                              | Root [`README.md`](../README.md)                                                     | Short; deep policy links out.                                                                                |
| **Regression / rollback / dependency plans**                    | `docs/REGRESSION_WORKFLOW.md`, `docs/ROLLBACK.md`, `docs/DEPENDENCY_UPGRADE_PLAN.md` | Keep procedural; avoid embedding full CI YAML in prose.                                                      |
| **Refactor pattern for large components**                       | [`docs/COMPONENT_DECOMPOSITION_PATTERN.md`](COMPONENT_DECOMPOSITION_PATTERN.md)      | Reference from app ARCHITECTURE when relevant.                                                               |
| **App-specific behavior**                                       | `src/<app>/README.md` (+ optional `DESIGN.md`, etc.)                                 | Entry URL, storage, odd constraints, **link** to shared testing notes (e.g. JSDOM media) instead of copying. |
| **App layout contract (workbench / footer)**                    | `src/<app>/LAYOUT.md` or `src/shared/layout/README.md`                               | Stanza: `src/stanza/LAYOUT.md`. Link from app README.                                                        |
| **Async analysis / background queue UX**                        | `src/<app>/DEVELOPMENT.md`                                                           | Beat: `src/beat/DEVELOPMENT.md`. Shared tempo: `src/shared/beat/TEST_MATRIX.md`.                             |
| **Playback hooks, notation render order, portal picker skins**  | `src/shared/hooks/PLAYBACK_HOOK_PATTERN.md` + `PLAYBACK_RENDERING_AUDIT.md`          | Agent rule: `.cursor/rules/playback-ui-regressions.mdc`. E2E smokes: `e2e/playback-ui-regressions.spec.ts`.  |

## Anti-patterns (reduce noise)

- **Duplicating `DEVELOPMENT.md` in `AGENTS.md` or app READMEs** — use a single subsection + link.
- **Long “history of how we got here” in living guides** — use ADR Context, `design-explorations/`, or an archived doc with a **Status: archived** banner (see [`ENGINEERING_AUDIT_2026-03.md`](ENGINEERING_AUDIT_2026-03.md)).
- **Documenting the obvious** (“`foo.ts` exports `foo`”) — prefer module layout in README only when it prevents real confusion.
- **Second sources for copy-paste commands** that already exist in `README.md` / `package.json` — one quick-reference is enough.

## Promoting buried app guidance to repo-wide

When **two or more apps** document the **same** non-obvious constraint or pattern (or one app’s note is clearly universal):

1. Add a tight subsection to **`STYLE_GUIDE.md`** (editing/testing/UI) or **`DEVELOPMENT.md`** (architecture/policy), **or** an ADR if the decision is material.
2. Replace the long app-local copy with **one sentence + link** (keep app-specific examples only if they differ).

**Examples already centralized (link from apps, do not re-expand):**

- Import boundaries, SPA shell, skip link, font bootstrap — `DEVELOPMENT.md` + guardrail tests.
- Labs debug mode — `DEVELOPMENT.md` + `AGENTS.md` pointer.
- JSDOM / `navigator.mediaDevices` — `STYLE_GUIDE.md` § Unit tests.
- Optional per-app visual contracts — e.g. Pitch [`src/pitch/DESIGN.md`](../src/pitch/DESIGN.md); pattern is “single `DESIGN.md` when the app has a fixed art direction,” not a global requirement.

**Candidates to watch** (promote when a second app needs the same text):

- Dense mix-rail / sidebar layout + shared sliders — prefer [`AppLinearVolumeSlider`](../src/shared/components/AppLinearVolumeSlider.tsx) and `SHARED_UI_CONVENTIONS.md`.
- E2E vs unit ownership per surface — keep in `REGRESSION_WORKFLOW.md` + app README one-liner.

## Lifecycle

- **After a migration is complete:** remove stale migration sections from living docs (see `SOURCE_OF_TRUTH.md` consistency rules).
- **When an exploration is accepted or rejected:** update `docs/design-explorations/README.md` table and move or delete the file so it is not mistaken for policy.
- **Quarterly (light touch):** skim `DEVELOPMENT.md` for sections that are fully superseded by ADRs; replace body with a short pointer to the ADR if useful.

## Related

- [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md) — precedence order.
- [`docs/adr/README.md`](adr/README.md) — when to write an ADR.
- [`docs/design-explorations/README.md`](design-explorations/README.md) — non-binding spikes.
