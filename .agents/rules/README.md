# Agent rules index

Scoped rules load when matching files are open or edited. **Always-apply** rules inject every session. Full agent workflow: [`AGENTS.md`](../../AGENTS.md). Repo skills: [`.agents/skills/README.md`](../skills/README.md).

This is the source of truth (tool-agnostic). `.cursor/rules/*.mdc` and `.claude/rules/*.md` are both generated from these files — see the note at the bottom.

| Rule                                                                       | Scope                                    | Canonical doc                                            | Skill                        |
| -------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| [`visual-regression-agent.md`](visual-regression-agent.md)                 | `e2e/visual/**`, visual baseline scripts | `docs/VISUAL_REGRESSION_AGENT.md`                        | `labs-visual-regression`     |
| [`pre-commit-checks.md`](pre-commit-checks.md)                             | **Always**                               | `npm run presubmit`                                      | —                            |
| [`feasibility-first.md`](feasibility-first.md)                             | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md`                      | —                            |
| [`ci-background-watch.md`](ci-background-watch.md)                         | **Always**                               | `docs/PR_WORKFLOW.md` § CI without blocking              | `labs-babysit-pr`            |
| [`flaky-tests.md`](flaky-tests.md)                                         | `**/*.test.ts`, Vitest config            | `docs/FLAKY_TESTS.md`                                    | —                            |
| [`ux-journey-mandatory.md`](ux-journey-mandatory.md)                       | **Always**                               | `docs/UX_AGENT_GUIDE.md`                                 | `labs-ux-journey`            |
| [`shared-ui-first.md`](shared-ui-first.md)                                 | `src/**/components/**`, `App.tsx`        | `SHARED_UI_CONVENTIONS.md`, `/ui/`                       | —                            |
| [`user-copy.md`](user-copy.md)                                             | `src/**/*.tsx`                           | `docs/USER_COPY_STYLE.md`                                | —                            |
| [`app-entry-html.md`](app-entry-html.md)                                   | `src/**/index.html`                      | `app-index.starter.html`                                 | —                            |
| [`spa-css-conventions.md`](spa-css-conventions.md)                         | `**/*.css`                               | `STYLE_GUIDE.md`                                         | —                            |
| [`material-icon-sizing.md`](material-icon-sizing.md)                       | `**/*.css`, `src/shared/ui/icons/**`     | `e2e/visual/visualTestUtils.ts`                          | —                            |
| [`content-integrity.md`](content-integrity.md)                             | `**/curriculum/**`, `**/generators/**`   | `docs/CONTENT_ACCURACY.md`                               | —                            |
| [`layout-no-horizontal-scroll.md`](layout-no-horizontal-scroll.md)         | `src/**/*.tsx`, `src/**/*.css`, e2e      | `docs/E2E_SMOKE_CONVENTIONS.md`                          | —                            |
| [`responsive-design.md`](responsive-design.md)                             | CSS / layout / layout-heuristics e2e     | `docs/RESPONSIVE_DESIGN.md`                              | —                            |
| [`react-a11y.md`](react-a11y.md)                                           | `**/*.tsx`                               | `STYLE_GUIDE.md`, `spaGuardrails.test.ts`                | —                            |
| [`architecture-decisions.md`](architecture-decisions.md)                   | ADR/routing/hosting paths                | `docs/adr/README.md`                                     | `labs-write-adr`             |
| [`playback-ui-regressions.md`](playback-ui-regressions.md)                 | playback, notation, renderers            | `PLAYBACK_HOOK_PATTERN.md`                               | `labs-playback-bugfix`       |
| [`inline-drum-ux.md`](inline-drum-ux.md)                                   | inline drum hosts, DrumAccompaniment     | `SHARED_UI_CONVENTIONS.md` § Inline drums                | —                            |
| [`encore-originals-chord-paint.md`](encore-originals-chord-paint.md)       | `encore/originals/**`, `chordPro/**`     | `originals/DEVELOPMENT.md`                               | —                            |
| [`encore-performance-ux.md`](encore-performance-ux.md)                     | performance components, editor           | `src/encore/PERFORMANCE_UX.md`                           | —                            |
| [`encore-list-tab-performance.md`](encore-list-tab-performance.md)         | Encore keep-alive list tabs              | `src/encore/README.md` § List performance                | `labs-performance`           |
| [`encore-practice-resource-dnd.md`](encore-practice-resource-dnd.md)       | Practice resource chip drag-and-drop     | `src/encore/AGENTS.md` § Practice resource DnD           | —                            |
| [`encore-originals-layout.md`](encore-originals-layout.md)                 | `encore/originals/**`                    | `originals/DEVELOPMENT.md`                               | —                            |
| [`gesture-linen-design.md`](gesture-linen-design.md)                       | `gesture/**`                             | `src/gesture/DESIGN.md`                                  | —                            |
| [`gesture-media-tiers.md`](gesture-media-tiers.md)                         | Gesture media / preview / session        | `src/gesture/AGENTS.md` § Media tiers                    | —                            |
| [`zines-image-display-tiers.md`](zines-image-display-tiers.md)             | Zine Studio preview / export images      | `src/zines/DEVELOPMENT.md` § Image display               | —                            |
| [`lyrefly-riso-cube-design.md`](lyrefly-riso-cube-design.md)               | `lyrefly/**`                             | `src/lyrefly/DESIGN.md`                                  | —                            |
| [`muscle-canvas-perf.md`](muscle-canvas-perf.md)                           | `muscle/components/canvas/**`            | `src/muscle/CUJs.md` CUJ-001                             | `labs-performance`           |
| [`dexie-live-query-empty-states.md`](dexie-live-query-empty-states.md)     | Dexie `useLiveQuery` surfaces            | `resolveDexieLiveQuery.ts`, Encore library               | —                            |
| [`stanza-viewer-layout.md`](stanza-viewer-layout.md)                       | `stanza/**`                              | `stanza/LAYOUT.md`                                       | —                            |
| [`stanza-drive-sync.md`](stanza-drive-sync.md)                             | `stanza/drive/**`, backup hook           | `stanza/AGENTS.md` § Drive sync                          | —                            |
| [`portfolio-drive-data-loss.md`](portfolio-drive-data-loss.md)             | Drive sync, merge, backup hooks          | `DRIVE_SYNC_DATA_LOSS_PREVENTION.md`                     | `labs-drive-backup`          |
| [`beat-analysis-scope.md`](beat-analysis-scope.md)                         | beat analysis paths                      | `stanza/ANALYZE.md`, `beat/TEST_MATRIX.md`               | —                            |
| [`drum-notation-mini-host.md`](drum-notation-mini-host.md)                 | DrumNotationMini hosts                   | `DrumNotationMini.tsx`                                   | —                            |
| [`session-retrospective-mandatory.md`](session-retrospective-mandatory.md) | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md`                      | `labs-session-retrospective` |
| [`session-throughput.md`](session-throughput.md)                           | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md` § Session throughput | —                            |
| [`react-interaction-perf.md`](react-interaction-perf.md)                   | Control + grid tabs, practice configure  | `docs/PERFORMANCE.md`                                    | `labs-performance`           |
| [`stale-preview-callback-deps.md`](stale-preview-callback-deps.md)         | preview/strip hooks with async deps      | `docs/PROCESS_BACKLOG.md`                                | —                            |
| [`ux-agent-guide.md`](ux-agent-guide.md)                                   | `src/**/components/**`, app shells, CSS  | `docs/UX_AGENT_GUIDE.md`                                 | `labs-ux-journey`            |
| [`selection-visual-hierarchy.md`](selection-visual-hierarchy.md)           | metronome, chips, shared theme CSS       | `docs/SELECTION_VISUAL_HIERARCHY.md`                     | —                            |
| [`focus-theming.md`](focus-theming.md)                                     | `**/*.css`, shared components, main.tsx  | `docs/FOCUS_THEMING.md`                                  | —                            |
| [`writing-style.md`](writing-style.md)                                     | **Always**                               | —                                                        | —                            |

**Maintenance:** When adding a rule or skill, update this table and [`.agents/skills/README.md`](../skills/README.md) in the same PR. Keep each rule **~50 lines**; link to canonical docs for prose. Prefer **enforcement** (tests, ESLint) over duplicated policy.

**Generated copies — do not hand-edit:** `.cursor/rules/*.mdc` and `.claude/rules/*.md` are both generated from these files by `npm run generate:agent-guidance` (frontmatter translated per tool: Cursor keeps `globs:`/`alwaysApply:`, Claude Code gets `paths:` or no frontmatter). Edit here, then regenerate. Pre-commit and CI keep all three in sync automatically.
