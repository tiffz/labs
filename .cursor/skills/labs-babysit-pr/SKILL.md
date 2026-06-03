---
name: labs-babysit-pr
description: Keeps a Labs pull request merge-ready by triaging review comments, resolving merge conflicts, and fixing CI in a loop. Use when babysitting a PR, addressing Bugbot, fixing merge-blocking CI, or when the user asks to get a PR ready to merge.
---

# Labs babysit PR

Get the PR to a **merge-ready** state: green CI, conflicts resolved, actionable comments addressed.

## Workflow

1. **Check status** — PR state, latest CI, unresolved review threads (filter resolved threads out)
2. **Merge conflicts** — resolve intelligently; preserve intent on both sides. If intents conflict, stop and ask
3. **Comments** — review active unresolved comments (including Bugbot). Read only comment body + minimum location needed. Validate Bugbot findings; push back when wrong or uncertain
4. **CI** — fix failures **within this PR's scope**. Never weaken CI/workflows to pass. Never make unrelated code changes to green unrelated failures — report instead. If failure seems unrelated, merge latest base branch first (another PR may have fixed it)
5. **Verify** — push scoped fixes, re-watch CI until mergeable + green + comments triaged
6. **Labs gate** — run `npm run presubmit` locally before pushing substantive fixes

## Boundaries

- Do not commit/push unless the user requested babysitting with push authority
- Ask before expanding scope beyond the PR
- Follow root [`AGENTS.md`](../../AGENTS.md) § Boundaries
