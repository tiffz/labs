# Repo Agent Skills

Portable [Agent Skills](https://agentskills.io/home) for Labs workflows. Discovery: name + description load at startup; full `SKILL.md` loads when a task matches.

**Always-on policy:** root [`AGENTS.md`](../../AGENTS.md) + [`.cursor/rules/`](../rules/README.md) (path-scoped).

| Skill                                                                   | When to use                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`labs-playback-bugfix`](labs-playback-bugfix/SKILL.md)                 | Playback, notation, VexFlow, portal picker, async stop regressions        |
| [`labs-visual-regression`](labs-visual-regression/SKILL.md)             | Visual or audio baseline verify/update                                    |
| [`labs-session-retrospective`](labs-session-retrospective/SKILL.md)     | Substantial session complete; **deliver** retrospective; codify learnings |
| [`labs-ux-journey`](labs-ux-journey/SKILL.md)                           | New/major UI; journey hierarchy; gestalt, redundancy, visual weight       |
| [`labs-babysit-pr`](labs-babysit-pr/SKILL.md)                           | Keep a PR merge-ready (comments, CI, conflicts); merge when user asks     |
| [`labs-split-to-prs`](labs-split-to-prs/SKILL.md)                       | Split branch/work into small reviewable PRs                               |
| [`labs-write-adr`](labs-write-adr/SKILL.md)                             | Material architecture decision (routing, OAuth, boundaries)               |
| [`labs-component-decomposition`](labs-component-decomposition/SKILL.md) | Split oversized React containers (>600 lines)                             |
| [`labs-rhythm-preset`](labs-rhythm-preset/SKILL.md)                     | Edit `RHYTHM_DATABASE` / rhythm preset integrity                          |
| [`labs-new-micro-app`](labs-new-micro-app/SKILL.md)                     | New micro-app shell, index.html, vite entry, boundaries                   |
| [`labs-url-state`](labs-url-state/SKILL.md)                             | URL param sync, shareable links, useUrlState hooks                        |
| [`labs-iteration-handoff`](labs-iteration-handoff/SKILL.md)             | Mid-refactor handoff for next session                                     |
| [`labs-drive-backup`](labs-drive-backup/SKILL.md)                       | Google Drive backup, conflict prompts, sync hooks                         |
| [`labs-dependency-upgrade`](labs-dependency-upgrade/SKILL.md)           | Toolchain / dependency major upgrades                                     |
| [`labs-ui-design-variations`](labs-ui-design-variations/SKILL.md)       | In-app design theme iterations + live preview selector                    |
| [`labs-performance`](labs-performance/SKILL.md)                         | CUJ interaction latency, render isolation, perf benchmarks                |

**Maintenance:** Add a row here when creating a skill. Run `npm run check:agent-docs` in presubmit/CI.
