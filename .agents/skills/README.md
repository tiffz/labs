# Repo Agent Skills

Portable [Agent Skills](https://agentskills.io/home) for Labs workflows. Discovery: name + description load at startup; full `SKILL.md` loads when a task matches.

This is the source of truth (tool-agnostic). `.cursor/skills/*` and `.claude/skills/*` are both generated verbatim from these files — see the note at the bottom.

**Always-on policy:** root [`AGENTS.md`](../../AGENTS.md) + [`.agents/rules/`](../rules/README.md) (path-scoped).

| Skill                                                                   | When to use                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`labs-playback-bugfix`](labs-playback-bugfix/SKILL.md)                 | Playback, notation, VexFlow, portal picker, async stop regressions                    |
| [`labs-visual-regression`](labs-visual-regression/SKILL.md)             | Visual or audio baseline verify/update                                                |
| [`labs-visual-judge`](labs-visual-judge/SKILL.md)                       | Judge screenshot diffs against the rubric (must-fix / accept / escalate)              |
| [`labs-session-retrospective`](labs-session-retrospective/SKILL.md)     | Substantial session complete; **deliver** retrospective; codify learnings             |
| [`labs-ux-journey`](labs-ux-journey/SKILL.md)                           | New/major UI; journey hierarchy; gestalt, redundancy, visual weight                   |
| [`labs-babysit-pr`](labs-babysit-pr/SKILL.md)                           | Keep a PR merge-ready (comments, CI, conflicts); merge when user asks                 |
| [`labs-local-review`](labs-local-review/SKILL.md)                       | Pre-merge "second opinion" — 3 read-only reviewer subagents, verify, gate             |
| [`labs-pm-review`](labs-pm-review/SKILL.md)                             | Proposal gate — senior PM judges audience, scope, portfolio fit (go/refine/no-go)     |
| [`labs-architecture-review`](labs-architecture-review/SKILL.md)         | Design gate — senior architect reviews a major technical design before build          |
| [`labs-ux-review`](labs-ux-review/SKILL.md)                             | Pre-merge gate — senior UX designer audits the rendered UI of a major UX change       |
| [`labs-qa-review`](labs-qa-review/SKILL.md)                             | Pre-merge gate — QA tester stress-tests a major feature; bugs become regression tests |
| [`labs-agentic-review`](labs-agentic-review/SKILL.md)                   | Audit agent guidance (subagents/skills/rules) for agentic best practices              |
| [`labs-architecture-audit`](labs-architecture-audit/SKILL.md)           | Proactively hunt fragile subsystems that breed bug clusters; escalate on clustering   |
| [`labs-split-to-prs`](labs-split-to-prs/SKILL.md)                       | Split branch/work into small reviewable PRs                                           |
| [`labs-write-adr`](labs-write-adr/SKILL.md)                             | Material architecture decision (routing, OAuth, boundaries)                           |
| [`labs-component-decomposition`](labs-component-decomposition/SKILL.md) | Split oversized React containers (>600 lines)                                         |
| [`labs-rhythm-preset`](labs-rhythm-preset/SKILL.md)                     | Edit `RHYTHM_DATABASE` / rhythm preset integrity                                      |
| [`labs-new-micro-app`](labs-new-micro-app/SKILL.md)                     | New micro-app shell, index.html, vite entry, boundaries                               |
| [`labs-url-state`](labs-url-state/SKILL.md)                             | URL param sync, shareable links, useUrlState hooks                                    |
| [`labs-iteration-handoff`](labs-iteration-handoff/SKILL.md)             | Mid-refactor handoff for next session                                                 |
| [`labs-drive-backup`](labs-drive-backup/SKILL.md)                       | Google Drive backup, conflict prompts, sync hooks                                     |
| [`labs-dependency-upgrade`](labs-dependency-upgrade/SKILL.md)           | Toolchain / dependency major upgrades                                                 |
| [`labs-ui-design-variations`](labs-ui-design-variations/SKILL.md)       | In-app design theme iterations + live preview selector                                |
| [`labs-performance`](labs-performance/SKILL.md)                         | CUJ interaction latency, render isolation, perf benchmarks                            |
| [`labs-e2e-smoke`](labs-e2e-smoke/SKILL.md)                             | Playwright journey smokes, fixtures, scoped e2e map                                   |
| [`labs-muscle-anatomy-export`](labs-muscle-anatomy-export/SKILL.md)     | Z-Anatomy Blender export → validate → sync bridge → visual checklist                  |

**Maintenance:** Add a row here when creating a skill. Run `npm run check:agent-docs` in presubmit/CI.

**Generated copies — do not hand-edit:** `.cursor/skills/*` and `.claude/skills/*` are both generated verbatim from these files by `npm run generate:agent-guidance`. Edit here, then regenerate. Pre-commit and CI keep all three in sync automatically.
