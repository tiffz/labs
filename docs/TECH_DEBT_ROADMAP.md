# Tech debt roadmap

Single prioritized registry for structural debt. Before this doc, debt was scattered across
six docs; each item below names its **canonical detail doc** — this file owns only priority,
entry criteria, and status. Update the status column when an item starts or lands; file new
items here first, then link out.

Review cadence: skim during each `labs-session-retrospective` when touching an affected
subsystem; full re-prioritization quarterly with the [`GUIDANCE_EVALS.md`](GUIDANCE_EVALS.md) run.

## Prioritized queue

| #   | Item                                                                                                                                                                                                 | Canonical detail                                                                                                 | Entry criteria (start when…)                                                                                          | Status   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Stanza-Encore sync migration completion** — finish the dual-read/dual-write cutover so practice resources have one owner                                                                           | [ADR 0007-revision](adr/0007-revision-stanza-encore-federated-sync.md)                                           | Visual + e2e coverage from the screenshot pipeline overhaul is landed and green for ~2 weeks (protects the migration) | queued   |
| 2   | **Drive stack unification** — migrate Stanza (`useStanzaDriveBackup`, ~805 lines) and Gesture (`useGestureDriveBackup`, ~538) onto `createLabsPortfolioDriveBackup`; Encore last (most bespoke)      | [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md), skill `labs-drive-backup`            | Item 1 merged (sync contract stable)                                                                                  | queued   |
| 3   | **`vite.config.ts` modularization** — split ~1,211 lines into `config/` modules (apps, redirects, plugins, test)                                                                                     | — (mechanical; no design doc needed)                                                                             | Any session already touching vite.config for another reason, or before the Vite 8 major                               | queued   |
| 4   | **CSS `!important` burn-down** — ratchet `check:css-important` baseline (282) stepwise toward <40 by requiring net-negative on touched files instead of a flat ceiling                               | [`CSS_IMPORTANT_AUDIT.md`](CSS_IMPORTANT_AUDIT.md)                                                               | Immediately; each CSS-touching PR lowers its files' count                                                             | ongoing  |
| 5   | **Dependency majors** — Vite 8, Vitest 4, Tailwind 4, phased                                                                                                                                         | [`DEPENDENCY_UPGRADE_PLAN.md`](DEPENDENCY_UPGRADE_PLAN.md), skill `labs-dependency-upgrade`                      | CI parallelization proven (~2 weeks of runs) so upgrade PRs iterate fast                                              | queued   |
| 6   | **SessionScreen / LibraryScreen decompositions** — `src/scales/components/SessionScreen.tsx` (~3.1k lines), `src/encore/components/LibraryScreen.tsx` (~2.5k), following the StanzaWorkspace pattern | [`COMPONENT_DECOMPOSITION_PATTERN.md`](COMPONENT_DECOMPOSITION_PATTERN.md), skill `labs-component-decomposition` | StanzaWorkspace decomposition merged without regressions                                                              | deferred |

## Consciously skipped (decided, not forgotten)

Re-open only if the trigger occurs:

- **PR preview deploys** — solo GitHub-Pages portfolio; dev server + visual pipeline cover review needs. Trigger: a second regular contributor.
- **License compliance checks** — no distribution/compliance exposure. Trigger: commercial use.
- **Commit lint / conventional commits** — squash-merge PR titles carry the history. Trigger: automated changelog need.
- **jscpd duplication gate** — Knip + guardrail tests catch the harmful subset. Trigger: duplication-caused bug class appearing twice.
- **knip-ignore shrink** — low value until the ignore list blocks a real detection.
- **Automated LLM guidance-eval harness** (Cursor SDK) — manual protocol in [`GUIDANCE_EVALS.md`](GUIDANCE_EVALS.md) is sufficient at current cadence. Trigger: quarterly manual runs get skipped twice, or guidance regressions recur.
- **Full-suite blocking visual on PRs** — scoped visual is blocking; full stays advisory. Flip trigger: ~2 weeks of clean nightly visual runs ([`VISUAL_REGRESSION_AGENT.md`](VISUAL_REGRESSION_AGENT.md)).
