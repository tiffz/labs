# Cursor rules index

Scoped rules load when matching files are open or edited. **Always-apply** rules inject every session. Full agent workflow: [`AGENTS.md`](../../AGENTS.md). Repo skills: [`.cursor/skills/README.md`](../skills/README.md).

| Rule                                                                         | Scope                                    | Canonical doc                              | Skill                        |
| ---------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------ | ---------------------------- |
| [`visual-regression-agent.mdc`](visual-regression-agent.mdc)                 | `e2e/visual/**`, visual baseline scripts | `docs/VISUAL_REGRESSION_AGENT.md`          | `labs-visual-regression`     |
| [`pre-commit-checks.mdc`](pre-commit-checks.mdc)                             | **Always**                               | `npm run presubmit`                        | —                            |
| [`ux-journey-mandatory.mdc`](ux-journey-mandatory.mdc)                       | **Always**                               | `docs/UX_AGENT_GUIDE.md`                   | `labs-ux-journey`            |
| [`shared-ui-first.mdc`](shared-ui-first.mdc)                                 | `src/**/components/**`, `App.tsx`        | `SHARED_UI_CONVENTIONS.md`, `/ui/`         | —                            |
| [`user-copy.mdc`](user-copy.mdc)                                             | `src/**/*.tsx`                           | `docs/USER_COPY_STYLE.md`                  | —                            |
| [`app-entry-html.mdc`](app-entry-html.mdc)                                   | `src/**/index.html`                      | `app-index.starter.html`                   | —                            |
| [`spa-css-conventions.mdc`](spa-css-conventions.mdc)                         | `**/*.css`                               | `STYLE_GUIDE.md`                           | —                            |
| [`react-a11y.mdc`](react-a11y.mdc)                                           | `**/*.tsx`                               | `STYLE_GUIDE.md`, `spaGuardrails.test.ts`  | —                            |
| [`architecture-decisions.mdc`](architecture-decisions.mdc)                   | ADR/routing/hosting paths                | `docs/adr/README.md`                       | `labs-write-adr`             |
| [`playback-ui-regressions.mdc`](playback-ui-regressions.mdc)                 | playback, notation, renderers            | `PLAYBACK_HOOK_PATTERN.md`                 | `labs-playback-bugfix`       |
| [`inline-drum-ux.mdc`](inline-drum-ux.mdc)                                   | inline drum hosts, DrumAccompaniment     | `SHARED_UI_CONVENTIONS.md` § Inline drums  | —                            |
| [`encore-originals-chord-paint.mdc`](encore-originals-chord-paint.mdc)       | `encore/originals/**`, `chordPro/**`     | `originals/DEVELOPMENT.md`                 | —                            |
| [`encore-performance-ux.mdc`](encore-performance-ux.mdc)                     | performance components, editor           | `src/encore/PERFORMANCE_UX.md`             | —                            |
| [`gesture-linen-design.mdc`](gesture-linen-design.mdc)                       | `gesture/**`                             | `src/gesture/DESIGN.md`                    | —                            |
| [`gesture-media-tiers.mdc`](gesture-media-tiers.mdc)                         | Gesture media / preview / session        | `src/gesture/AGENTS.md` § Media tiers      | —                            |
| [`dexie-live-query-empty-states.mdc`](dexie-live-query-empty-states.mdc)     | Dexie `useLiveQuery` surfaces            | `resolveDexieLiveQuery.ts`, Encore library | —                            |
| [`stanza-viewer-layout.mdc`](stanza-viewer-layout.mdc)                       | `stanza/**`                              | `stanza/LAYOUT.md`                         | —                            |
| [`beat-analysis-scope.mdc`](beat-analysis-scope.mdc)                         | beat analysis paths                      | `stanza/ANALYZE.md`, `beat/TEST_MATRIX.md` | —                            |
| [`drum-notation-mini-host.mdc`](drum-notation-mini-host.mdc)                 | DrumNotationMini hosts                   | `DrumNotationMini.tsx`                     | —                            |
| [`session-retrospective-mandatory.mdc`](session-retrospective-mandatory.mdc) | **Always**                               | `CONTINUOUS_PROCESS_IMPROVEMENT.md`        | `labs-session-retrospective` |
| [`session-retrospective.mdc`](session-retrospective.mdc)                     | Reference (skill pointer)                | `CONTINUOUS_PROCESS_IMPROVEMENT.md`        | `labs-session-retrospective` |
| [`ux-agent-guide.mdc`](ux-agent-guide.mdc)                                   | `src/**/components/**`, app shells, CSS  | `docs/UX_AGENT_GUIDE.md`                   | `labs-ux-journey`            |

**Maintenance:** When adding a rule or skill, update this table and [`.cursor/skills/README.md`](../skills/README.md) in the same PR. Keep each rule **~50 lines**; link to canonical docs for prose. Prefer **enforcement** (tests, ESLint) over duplicated policy.
