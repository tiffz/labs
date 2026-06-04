# DEVELOPMENT.md — agent index

Progressive disclosure for coding assistants. Read **only the section** that matches your task; full prose lives in [`DEVELOPMENT.md`](../DEVELOPMENT.md).

| Task                                     | Read                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Import boundaries, cross-app reuse       | `DEVELOPMENT.md` § Cross-App Reuse and Import Boundaries                                                                                        |
| New micro-app, `index.html`, SPA shell   | `DEVELOPMENT.md` § SPA Shell Hardening + [`app-index.starter.html`](../src/shared/templates/app-index.starter.html); skill `labs-new-micro-app` |
| Bundle splitting, lazy routes            | `DEVELOPMENT.md` § Bundle Splitting                                                                                                             |
| Micro-app fonts / responsive UI          | `DEVELOPMENT.md` § Micro-app UI stability                                                                                                       |
| Playback UI, portal pickers, notation    | `DEVELOPMENT.md` § Playback UI patterns; skill `labs-playback-bugfix`                                                                           |
| Testing strategy, CI vs local            | `DEVELOPMENT.md` § Quality Assurance                                                                                                            |
| Labs debug mode                          | `DEVELOPMENT.md` § Labs debug mode                                                                                                              |
| Material architecture (routing, OAuth)   | [`docs/adr/README.md`](adr/README.md); skill `labs-write-adr`                                                                                   |
| URL param sync                           | [`docs/URL_STATE_PATTERN.md`](URL_STATE_PATTERN.md); skill `labs-url-state`                                                                     |
| Visual / audio baselines                 | [`docs/REGRESSION_WORKFLOW.md`](REGRESSION_WORKFLOW.md); skill `labs-visual-regression`                                                         |
| Large component refactor                 | [`docs/COMPONENT_DECOMPOSITION_PATTERN.md`](COMPONENT_DECOMPOSITION_PATTERN.md); skill `labs-component-decomposition`                           |
| Rhythm presets                           | `presetIntegrity.test.ts`; skill `labs-rhythm-preset`                                                                                           |
| Dependency upgrades                      | [`docs/DEPENDENCY_UPGRADE_PLAN.md`](DEPENDENCY_UPGRADE_PLAN.md); skill `labs-dependency-upgrade`                                                |
| Open / merge PRs (solo, no human review) | [`docs/PR_WORKFLOW.md`](PR_WORKFLOW.md); skills `labs-babysit-pr`, `labs-split-to-prs`                                                          |
| Session retrospective / codify learnings | skill `labs-session-retrospective`                                                                                                              |
| Mid-refactor handoff                     | skill `labs-iteration-handoff`                                                                                                                  |
| Drive backup / conflict UX               | skill `labs-drive-backup`; `SHARED_UI_CONVENTIONS.md` § Drive                                                                                   |

Human precedence: [`docs/SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md). Agent workflow entry: [`AGENTS.md`](../AGENTS.md).
