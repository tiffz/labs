# Cursor rules index

Scoped rules load when matching files are open or edited. **Always-apply** rules inject every session. Full agent workflow: [`AGENTS.md`](../../AGENTS.md). Repo skills: [`.cursor/skills/README.md`](../skills/README.md).

| Rule                                                                         | Scope                                    | Canonical doc                                  | Skill                        |
| ---------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- | ---------------------------- |
| [`visual-regression-agent.mdc`](visual-regression-agent.mdc)                 | `e2e/visual/**`, visual baseline scripts | `docs/VISUAL_REGRESSION_AGENT.md`              | `labs-visual-regression`     |
| [`pre-commit-checks.mdc`](pre-commit-checks.mdc)                             | **Always**                               | `npm run presubmit`                            | —                            |
| [`feasibility-first.mdc`](feasibility-first.mdc)                             | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md`            | —                            |
| [`ci-background-watch.mdc`](ci-background-watch.mdc)                         | **Always**                               | `docs/PR_WORKFLOW.md` § CI without blocking    | `labs-babysit-pr`            |
| [`flaky-tests.mdc`](flaky-tests.mdc)                                         | `**/*.test.ts`, Vitest config            | `docs/FLAKY_TESTS.md`                          | —                            |
| [`ux-journey-mandatory.mdc`](ux-journey-mandatory.mdc)                       | **Always**                               | `docs/UX_AGENT_GUIDE.md`                       | `labs-ux-journey`            |
| [`shared-ui-first.mdc`](shared-ui-first.mdc)                                 | `src/**/components/**`, `App.tsx`        | `SHARED_UI_CONVENTIONS.md`, `/ui/`             | —                            |
| [`user-copy.mdc`](user-copy.mdc)                                             | `src/**/*.tsx`                           | `docs/USER_COPY_STYLE.md`                      | —                            |
| [`app-entry-html.mdc`](app-entry-html.mdc)                                   | `src/**/index.html`                      | `app-index.starter.html`                       | —                            |
| [`spa-css-conventions.mdc`](spa-css-conventions.mdc)                         | `**/*.css`                               | `STYLE_GUIDE.md`                               | —                            |
| [`layout-no-horizontal-scroll.mdc`](layout-no-horizontal-scroll.mdc)         | `src/**/*.tsx`, `src/**/*.css`, e2e      | `docs/E2E_SMOKE_CONVENTIONS.md`                | —                            |
| [`responsive-design.mdc`](responsive-design.mdc)                             | CSS / layout / layout-heuristics e2e     | `docs/RESPONSIVE_DESIGN.md`                    | —                            |
| [`react-a11y.mdc`](react-a11y.mdc)                                           | `**/*.tsx`                               | `STYLE_GUIDE.md`, `spaGuardrails.test.ts`      | —                            |
| [`architecture-decisions.mdc`](architecture-decisions.mdc)                   | ADR/routing/hosting paths                | `docs/adr/README.md`                           | `labs-write-adr`             |
| [`playback-ui-regressions.mdc`](playback-ui-regressions.mdc)                 | playback, notation, renderers            | `PLAYBACK_HOOK_PATTERN.md`                     | `labs-playback-bugfix`       |
| [`inline-drum-ux.mdc`](inline-drum-ux.mdc)                                   | inline drum hosts, DrumAccompaniment     | `SHARED_UI_CONVENTIONS.md` § Inline drums      | —                            |
| [`encore-originals-chord-paint.mdc`](encore-originals-chord-paint.mdc)       | `encore/originals/**`, `chordPro/**`     | `originals/DEVELOPMENT.md`                     | —                            |
| [`encore-performance-ux.mdc`](encore-performance-ux.mdc)                     | performance components, editor           | `src/encore/PERFORMANCE_UX.md`                 | —                            |
| [`encore-list-tab-performance.mdc`](encore-list-tab-performance.mdc)         | Encore keep-alive list tabs              | `src/encore/README.md` § List performance      | `labs-performance`           |
| [`encore-practice-resource-dnd.mdc`](encore-practice-resource-dnd.mdc)       | Practice resource chip drag-and-drop     | `src/encore/AGENTS.md` § Practice resource DnD | —                            |
| [`encore-originals-layout.mdc`](encore-originals-layout.mdc)                 | `encore/originals/**`                    | `originals/DEVELOPMENT.md`                     | —                            |
| [`gesture-linen-design.mdc`](gesture-linen-design.mdc)                       | `gesture/**`                             | `src/gesture/DESIGN.md`                        | —                            |
| [`gesture-media-tiers.mdc`](gesture-media-tiers.mdc)                         | Gesture media / preview / session        | `src/gesture/AGENTS.md` § Media tiers          | —                            |
| [`zines-image-display-tiers.mdc`](zines-image-display-tiers.mdc)             | Zine Studio preview / export images      | `src/zines/DEVELOPMENT.md` § Image display     | —                            |
| [`lyrefly-riso-cube-design.mdc`](lyrefly-riso-cube-design.mdc)               | `lyrefly/**`                             | `src/lyrefly/DESIGN.md`                        | —                            |
| [`muscle-canvas-perf.mdc`](muscle-canvas-perf.mdc)                           | `muscle/components/canvas/**`            | `src/muscle/CUJs.md` CUJ-001                   | `labs-performance`           |
| [`dexie-live-query-empty-states.mdc`](dexie-live-query-empty-states.mdc)     | Dexie `useLiveQuery` surfaces            | `resolveDexieLiveQuery.ts`, Encore library     | —                            |
| [`stanza-viewer-layout.mdc`](stanza-viewer-layout.mdc)                       | `stanza/**`                              | `stanza/LAYOUT.md`                             | —                            |
| [`stanza-drive-sync.mdc`](stanza-drive-sync.mdc)                             | `stanza/drive/**`, backup hook           | `stanza/AGENTS.md` § Drive sync                | —                            |
| [`portfolio-drive-data-loss.mdc`](portfolio-drive-data-loss.mdc)             | Drive sync, merge, backup hooks          | `DRIVE_SYNC_DATA_LOSS_PREVENTION.md`           | `labs-drive-backup`          |
| [`beat-analysis-scope.mdc`](beat-analysis-scope.mdc)                         | beat analysis paths                      | `stanza/ANALYZE.md`, `beat/TEST_MATRIX.md`     | —                            |
| [`drum-notation-mini-host.mdc`](drum-notation-mini-host.mdc)                 | DrumNotationMini hosts                   | `DrumNotationMini.tsx`                         | —                            |
| [`session-retrospective-mandatory.mdc`](session-retrospective-mandatory.mdc) | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md`            | `labs-session-retrospective` |
| [`react-interaction-perf.mdc`](react-interaction-perf.mdc)                   | Control + grid tabs, practice configure  | `docs/PERFORMANCE.md`                          | `labs-performance`           |
| [`stale-preview-callback-deps.mdc`](stale-preview-callback-deps.mdc)         | preview/strip hooks with async deps      | `docs/PROCESS_BACKLOG.md`                      | —                            |
| [`ux-agent-guide.mdc`](ux-agent-guide.mdc)                                   | `src/**/components/**`, app shells, CSS  | `docs/UX_AGENT_GUIDE.md`                       | `labs-ux-journey`            |
| [`selection-visual-hierarchy.mdc`](selection-visual-hierarchy.mdc)           | metronome, chips, shared theme CSS       | `docs/SELECTION_VISUAL_HIERARCHY.md`           | —                            |
| [`focus-theming.mdc`](focus-theming.mdc)                                     | `**/*.css`, shared components, main.tsx  | `docs/FOCUS_THEMING.md`                        | —                            |

**Maintenance:** When adding a rule or skill, update this table and [`.cursor/skills/README.md`](../skills/README.md) in the same PR. Keep each rule **~50 lines**; link to canonical docs for prose. Prefer **enforcement** (tests, ESLint) over duplicated policy.
