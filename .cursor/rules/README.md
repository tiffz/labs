# Cursor rules index

Scoped rules load when matching files are open or edited. **Always-apply** rules inject every session. Full agent workflow: [`AGENTS.md`](../../AGENTS.md). Repo skills: [`.cursor/skills/README.md`](../skills/README.md).

| Rule                                                                   | Scope                                | Canonical doc                             | Skill                        |
| ---------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------- |
| [`pre-commit-checks.mdc`](pre-commit-checks.mdc)                       | **Always**                           | `npm run presubmit`                       | —                            |
| [`shared-ui-first.mdc`](shared-ui-first.mdc)                           | `src/**/components/**`, `App.tsx`    | `SHARED_UI_CONVENTIONS.md`, `/ui/`        | —                            |
| [`user-copy.mdc`](user-copy.mdc)                                       | `src/**/*.tsx`                       | `docs/USER_COPY_STYLE.md`                 | —                            |
| [`app-entry-html.mdc`](app-entry-html.mdc)                             | `src/**/index.html`                  | `app-index.starter.html`                  | —                            |
| [`spa-css-conventions.mdc`](spa-css-conventions.mdc)                   | `**/*.css`                           | `STYLE_GUIDE.md`                          | —                            |
| [`react-a11y.mdc`](react-a11y.mdc)                                     | `**/*.tsx`                           | `STYLE_GUIDE.md`, `spaGuardrails.test.ts` | —                            |
| [`architecture-decisions.mdc`](architecture-decisions.mdc)             | ADR/routing/hosting paths            | `docs/adr/README.md`                      | `labs-write-adr`             |
| [`playback-ui-regressions.mdc`](playback-ui-regressions.mdc)           | playback, notation, renderers        | `PLAYBACK_HOOK_PATTERN.md`                | `labs-playback-bugfix`       |
| [`encore-originals-chord-paint.mdc`](encore-originals-chord-paint.mdc) | `encore/originals/**`, `chordPro/**` | `originals/DEVELOPMENT.md`                | —                            |
| [`stanza-viewer-layout.mdc`](stanza-viewer-layout.mdc)                 | `stanza/**`                          | `stanza/LAYOUT.md`                        | —                            |
| [`beat-analysis-scope.mdc`](beat-analysis-scope.mdc)                   | beat analysis paths                  | `beat/DEVELOPMENT.md`                     | —                            |
| [`drum-notation-mini-host.mdc`](drum-notation-mini-host.mdc)           | DrumNotationMini hosts               | `DrumNotationMini.tsx`                    | —                            |
| [`session-retrospective.mdc`](session-retrospective.mdc)               | Reference (not always-on)            | `CONTINUOUS_PROCESS_IMPROVEMENT.md`       | `labs-session-retrospective` |

**Maintenance:** When adding a rule or skill, update this table and [`.cursor/skills/README.md`](../skills/README.md) in the same PR. Keep each rule **~50 lines**; link to canonical docs for prose. Prefer **enforcement** (tests, ESLint) over duplicated policy.
