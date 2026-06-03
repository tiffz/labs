# Repo Agent Skills

Portable [Agent Skills](https://agentskills.io/home) for Labs workflows. Discovery: name + description load at startup; full `SKILL.md` loads when a task matches.

**Always-on policy:** root [`AGENTS.md`](../../AGENTS.md) + [`.cursor/rules/`](../rules/README.md) (path-scoped).

| Skill                                                                   | When to use                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`labs-playback-bugfix`](labs-playback-bugfix/SKILL.md)                 | Playback, notation, VexFlow, portal picker, async stop regressions |
| [`labs-visual-regression`](labs-visual-regression/SKILL.md)             | Visual or audio baseline verify/update                             |
| [`labs-session-retrospective`](labs-session-retrospective/SKILL.md)     | Substantial session complete; process feedback; codify learnings   |
| [`labs-babysit-pr`](labs-babysit-pr/SKILL.md)                           | Keep a PR merge-ready (comments, CI, conflicts)                    |
| [`labs-split-to-prs`](labs-split-to-prs/SKILL.md)                       | Split branch/work into small reviewable PRs                        |
| [`labs-write-adr`](labs-write-adr/SKILL.md)                             | Material architecture decision (routing, OAuth, boundaries)        |
| [`labs-component-decomposition`](labs-component-decomposition/SKILL.md) | Split oversized React containers (>600 lines)                      |

**Maintenance:** Add a row here when creating a skill. Run `npm run check:agent-docs` in presubmit/CI.
