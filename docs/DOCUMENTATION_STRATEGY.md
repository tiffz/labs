# Documentation strategy (Labs)

How we grow documentation without drift, duplication, or low-signal narrative. **Precedence when anything conflicts** still follows [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md); this file defines **where new material belongs** and **what to avoid**.

## Principles

1. **One canonical home per topic.** Other places link; they do not restate policy paragraphs.
2. **Prefer enforcement over prose.** If CI, ESLint, Vitest, or a script already encodes the rule, the doc should **point to the artifact** (file path + one sentence), not re-derive the rule in three paragraphs.
3. **Durable “why” and contracts; not play-by-play history.** Closed initiatives, old audits, and superseded plans belong in **git history**, an **ADR “Context”** section, or a clearly **archived** doc with a banner — not scattered through living guides.
4. **App docs stay local.** `src/<app>/README.md` (and optional `DESIGN.md`, `COPY_STYLE.md`, `ARCHITECTURE.md`) describe **that app’s behavior and constraints**. They must not redefine repo-wide policy (copy voice, import boundaries, SPA shell) — link to `DEVELOPMENT.md`, `STYLE_GUIDE.md`, or ADRs instead.
5. **Explorations ≠ policy.** `docs/design-explorations/` holds options and spikes. When a decision is made, **promote** to `docs/adr/` or `DEVELOPMENT.md` and **trim or archive** the exploration so readers are not pulled two ways.

## Agent reading budget

Load **narrowly** ([Agent Skills progressive disclosure](https://agentskills.io/home)): app `README` / nested `AGENTS.md` → matching skill or path rule → **one** canonical policy doc. Do not open `DEVELOPMENT.md` end-to-end or stack sync essays unless the task needs them.

| Task shape             | Read                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Feature in one app     | App README (+ nested AGENTS) + skill if routed                                                                                 |
| Drive / merge / delete | `SYNC_AND_AUTH_MAP` → `DRIVE_SYNC_DATA_LOSS_PREVENTION` → skill `labs-drive-backup` (`LOCAL_FIRST_SYNC` only for architecture) |
| Non-trivial UI         | Journey sketch (`labs-ux-journey`) + `UX_AGENT_GUIDE`                                                                          |
| Architecture change    | `adr/README` + one ADR + `DEVELOPMENT_AGENT_INDEX` section                                                                     |
| PR / CI babysit        | `PR_WORKFLOW` + `ci-background-watch.mdc` + skill `labs-babysit-pr`                                                            |

**Write short:** add what the agent would get wrong without the doc; omit generic HTTP/React/Drive primers. Prefer gotchas + checklists over history.

## Maintaining docs (agents)

**Agentskills progressive disclosure:** add what the agent lacks for the task; omit what it already knows. Route via `AGENTS.md` → skill/rule → **one** canonical doc. Do not paste the same checklist into AGENTS + skill + living guide.

| You changed…                      | Update                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drive merge / tombstone / sync UX | [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) checklist parity; app row in [`SYNC_AND_AUTH_MAP.md`](SYNC_AND_AUTH_MAP.md) / [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) if needed; skill `labs-drive-backup` table |
| OAuth / sync contract             | Real ADR via `labs-write-adr` — **never invent ADR filenames**; cite only [`adr/README.md`](adr/README.md)                                                                                                                                       |
| New nested AGENTS or skill        | Root `AGENTS.md` nested list / task routing; skills or rules README                                                                                                                                                                              |
| Solo PR / CI babysit conventions  | [`PR_WORKFLOW.md`](PR_WORKFLOW.md) for unique Labs norms; procedure stays in `labs-babysit-pr` / `ci-background-watch.mdc`                                                                                                                       |
| App behavior / entry URL          | `src/<app>/README.md` (+ nested `AGENTS.md` Start-here if paths change)                                                                                                                                                                          |
| Deferred process work             | [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md) — **Open/Deferred only**; delete Done rows when shipping                                                                                                                                              |
| Closed spike / superseded plan    | **Delete** or ≤10-line superseded stub + link; update `design-explorations/README.md`                                                                                                                                                            |
| Doc ownership / precedence        | This file + [`SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md)                                                                                                                                                                                           |

**Checklist before finishing a docs PR:** one canonical home (link, don’t restate); short procedure + gotchas; no invented ADR slugs; nested AGENTS Start-here paths still valid; `npm run check:doc-links` after deletes/renames.

**Do not:** duplicate `DEVELOPMENT.md` into AGENTS; leave Done rows in PROCESS_BACKLOG; keep parallel `GEMINI.md` product blurbs (redirects only).

## Agent context map

How Labs packages guidance for AI agents ([Agent Skills](https://agentskills.io/home) progressive disclosure). **Precedence when layers conflict:** [`AGENTS.md`](../AGENTS.md) § Agent precedence.

| Layer                  | Location                                                                        | Loads when                       | Holds                                                            |
| ---------------------- | ------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| **Always-on entry**    | Root [`AGENTS.md`](../AGENTS.md)                                                | Every session                    | Precedence, boundaries, task routing index, editing checklist    |
| **Always-on gate**     | [`.cursor/rules/pre-commit-checks.mdc`](../.cursor/rules/pre-commit-checks.mdc) | Every session                    | Presubmit before done (canonical; do not duplicate in AGENTS.md) |
| **Path-scoped rules**  | [`.cursor/rules/*.mdc`](../.cursor/rules/README.md)                             | Matching files open/edited       | Fragile invariants (~50 lines); link to human docs               |
| **Task-scoped skills** | [`.cursor/skills/<name>/`](../.cursor/skills/README.md)                         | Task matches skill `description` | Multi-step workflows; `references/` point at canonical docs      |
| **Domain discovery**   | `src/<app>/AGENTS.md`                                                           | Agent reads app being edited     | App pitfalls + test entry points (no cross-app policy)           |
| **Human canonical**    | `DEVELOPMENT.md`, ADRs, `STYLE_GUIDE.md`, app READMEs                           | Tier B or skill `references/`    | Durable why + contracts; enforced by CI/tests                    |

**Where to put new agent guidance:**

- **Universal never/always** → root `AGENTS.md` (keep lean)
- **File-path invariant** → new `.mdc` rule + row in rules README
- **Multi-step workflow with gates** → new `.cursor/skills/<name>/SKILL.md` + skills README row
- **Deep policy or rationale** → human doc; skill/rule **links** with a one-line pointer file in `references/`

**Anti-pattern:** duplicating `DEVELOPMENT.md` or playback checklists in AGENTS.md, app AGENTS.md, _and_ a skill — pick one activation layer + one canonical doc.

## Canonical map (where to put new content)

| Kind of content                                                 | Canonical location                                                                   | Notes                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Cross-app policy, guardrails, CI behavior**                   | Root [`DEVELOPMENT.md`](../DEVELOPMENT.md)                                           | Keep aligned with workflows and hooks in the same PR when behavior changes.                                                   |
| **Material architecture decision (alternatives, consequences)** | [`docs/adr/NNNN-title.md`](adr/README.md)                                            | Short, numbered; link from `DEVELOPMENT.md` when operators need a pointer.                                                    |
| **TypeScript / UI / a11y editing conventions**                  | [`STYLE_GUIDE.md`](../STYLE_GUIDE.md)                                                | Includes JSDOM/media testing, lazy test timeouts, density patterns.                                                           |
| **Default product copy voice**                                  | [`docs/USER_COPY_STYLE.md`](USER_COPY_STYLE.md)                                      | App `COPY_STYLE.md` = domain-only deltas.                                                                                     |
| **Shared UI primitives and tokens**                             | [`src/shared/SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md)      | New shared components: document + `/ui/` demo per `AGENTS.md` checklist.                                                      |
| **“Which doc wins?”**                                           | [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md)                                      | Update when introducing a new top-level policy file.                                                                          |
| **AI assistant workflow**                                       | [`AGENTS.md`](../AGENTS.md)                                                          | Task routing, boundaries, checklist; **link** to policy instead of duplicating `DEVELOPMENT.md`.                              |
| **Repo agent skills (workflows)**                               | [`.cursor/skills/<name>/`](../.cursor/skills/README.md)                              | [Agent Skills](https://agentskills.io/specification) format; `references/` link to human docs.                                |
| **Nested agent context (monorepo apps)**                        | `src/<app>/AGENTS.md` (+ app `README.md`)                                            | Index: root [`AGENTS.md`](../AGENTS.md) § Nested `AGENTS.md` (Encore, Gesture, Lyrefly, Stanza, Scrapboard, Muscle, Midi, …). |
| **Cursor rules index**                                          | [`.cursor/rules/README.md`](../.cursor/rules/README.md)                              | Update when adding scoped rules; add Skill column when a skill complements the rule.                                          |
| **Session retrospective / process improvement**                 | [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)        | Skill: `labs-session-retrospective`. PR template § Process improvements.                                                      |
| **Agent invariants index**                                      | [`docs/AGENT_INVARIANTS.md`](AGENT_INVARIANTS.md)                                    | Links to enforcing tests/rules.                                                                                               |
| **UX for agents (journey, gestalt, redundancy)**                | [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md)                                        | Skill: `labs-ux-journey`. Rule: `ux-agent-guide.mdc`.                                                                         |
| **Responsive layout (breakpoints, mobile checklist)**           | [`docs/RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md)                                  | Rule: `responsive-design.mdc`. Tokens: `src/shared/layout/labs-breakpoints.css`.                                              |
| **Selection / visual hierarchy (primary vs secondary)**         | [`docs/SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md)                | Rule: `selection-visual-hierarchy.mdc`. Metronome + chip tokens.                                                              |
| **Focus ring theming (keyboard a11y + CSS tokens)**             | [`docs/FOCUS_THEMING.md`](FOCUS_THEMING.md)                                          | Rule: `focus-theming.mdc`. Inset vs outset, sticky bar bleed, portal accent.                                                  |
| **Critical user journeys (CUJs)**                               | [`docs/CRITICAL_USER_JOURNEYS.md`](CRITICAL_USER_JOURNEYS.md), `src/<app>/CUJs.md`   | Promote from journey sketch; feeds perf smokes + manual verification.                                                         |
| **Performance (interaction + sustained)**                       | [`docs/PERFORMANCE.md`](PERFORMANCE.md)                                              | Skill: `labs-performance`. Rule: `react-interaction-perf.mdc`.                                                                |
| **E2e smoke conventions**                                       | [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md)                          | `e2e/routeRegistry.ts`.                                                                                                       |
| **CI path scoping**                                             | [`docs/CI_PATH_SCOPING.md`](CI_PATH_SCOPING.md)                                      | `scripts/run-scoped-e2e.mjs`, `test:changed-apps`.                                                                            |
| **Process improvement backlog**                                 | [`docs/PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md)                                      | Deferred retrospective items.                                                                                                 |
| **Onboarding, commands, repo map**                              | Root [`README.md`](../README.md)                                                     | Short; deep policy links out.                                                                                                 |
| **Regression / rollback / dependency plans**                    | `docs/REGRESSION_WORKFLOW.md`, `docs/ROLLBACK.md`, `docs/DEPENDENCY_UPGRADE_PLAN.md` | Keep procedural; avoid embedding full CI YAML in prose.                                                                       |
| **Solo PR workflow (CI gate, merge, bots)**                     | [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md)                                              | Skills: `labs-babysit-pr`, `labs-split-to-prs`. No human review — CI + presubmit is the bar.                                  |
| **CI / GitHub Actions reliability**                             | [`docs/CI_RELIABILITY.md`](CI_RELIABILITY.md)                                        | Single Pages deploy path; `npm run check:workflows` when editing workflows.                                                   |
| **Local-first sync (Drive backup)**                             | [`docs/LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md)                                    | Encore + Stanza + Scales; skill `labs-drive-backup`.                                                                          |
| **Refactor pattern for large components**                       | [`docs/COMPONENT_DECOMPOSITION_PATTERN.md`](COMPONENT_DECOMPOSITION_PATTERN.md)      | Reference from app ARCHITECTURE when relevant.                                                                                |
| **App-specific behavior**                                       | `src/<app>/README.md` (+ optional `DESIGN.md`, etc.)                                 | Entry URL, storage, odd constraints, **link** to shared testing notes (e.g. JSDOM media) instead of copying.                  |
| **App layout contract (workbench / footer)**                    | `src/<app>/LAYOUT.md` or `src/shared/layout/README.md`                               | Stanza: `src/stanza/LAYOUT.md`. Link from app README.                                                                         |
| **Async analysis / background queue UX**                        | [`src/stanza/ANALYZE.md`](../src/stanza/ANALYZE.md)                                  | Shared tempo: `src/shared/beat/TEST_MATRIX.md`.                                                                               |
| **URL param sync**                                              | [`docs/URL_STATE_PATTERN.md`](URL_STATE_PATTERN.md)                                  | Skill: `labs-url-state`. App tables stay in app READMEs.                                                                      |
| **Tier B DEVELOPMENT sections (agents)**                        | [`docs/DEVELOPMENT_AGENT_INDEX.md`](DEVELOPMENT_AGENT_INDEX.md)                      | Pointer index; full policy in `DEVELOPMENT.md`.                                                                               |
| **Playback hooks, notation render order, portal picker skins**  | `src/shared/hooks/PLAYBACK_HOOK_PATTERN.md` + `PLAYBACK_RENDERING_AUDIT.md`          | Agent rule: `.cursor/rules/playback-ui-regressions.mdc`. E2E smokes: `e2e/playback-ui-regressions.spec.ts`.                   |

## Anti-patterns (reduce noise)

- **Duplicating `DEVELOPMENT.md` in `AGENTS.md` or app READMEs** — use a single subsection + link.
- **Long “history of how we got here” in living guides** — use ADR Context or a short **Status: superseded** stub; delete closed no-go spikes.
- **Done-clogged backlogs** — [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md) is Open/Deferred only; do not re-list shipped rows.
- **Parallel `GEMINI.md` product blurbs** — root + app `GEMINI.md` are **redirects only** → `AGENTS.md` / app README.
- **Documenting the obvious** (“`foo.ts` exports `foo`”) — prefer module layout in README only when it prevents real confusion.
- **Second sources for copy-paste commands** that already exist in `README.md` / `package.json` — one quick-reference is enough.
- **Invented ADR filenames** — cite real paths from [`adr/README.md`](adr/README.md); never invent slugs.

## Promoting buried app guidance to repo-wide

When **two or more apps** document the **same** non-obvious constraint or pattern (or one app’s note is clearly universal):

1. Add a tight subsection to **`STYLE_GUIDE.md`** (editing/testing/UI) or **`DEVELOPMENT.md`** (architecture/policy), **or** an ADR if the decision is material.
2. Replace the long app-local copy with **one sentence + link** (keep app-specific examples only if they differ).

**Examples already centralized (link from apps, do not re-expand):**

- Import boundaries, SPA shell, skip link, font bootstrap — `DEVELOPMENT.md` + guardrail tests.
- Labs debug mode — `DEVELOPMENT.md` + `AGENTS.md` pointer.
- JSDOM / `navigator.mediaDevices` — `STYLE_GUIDE.md` § Unit tests.
- Per-app visual contracts — **no `DESIGN.md` means the app follows shared Material defaults** (`getAppTheme()` + `appSharedThemes.css` + `docs/UX_AGENT_GUIDE.md`). A `DESIGN.md` is **required only when the app diverges** (custom art direction, non-Material chrome, bespoke tokens) and must state what diverges and why; e.g. Gesture Linen ([`src/gesture/DESIGN.md`](../src/gesture/DESIGN.md)), Pitch ([`src/pitch/DESIGN.md`](../src/pitch/DESIGN.md)). Agents: before restyling an app without a `DESIGN.md`, treat shared defaults as the contract.

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
