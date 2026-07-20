---
name: labs-babysit-pr
description: Keeps a Labs pull request merge-ready by triaging review comments, resolving merge conflicts, and fixing CI in a loop. Use when babysitting a PR, addressing Bugbot/CodeRabbit, fixing merge-blocking CI, or when the user asks to get a PR ready to merge or merge it.
---

<!-- AUTO-GENERATED from .agents/skills/labs-babysit-pr/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs babysit PR

Get the PR to a **merge-ready** state: green CI, conflicts resolved, actionable comments addressed. Solo repo: **no human review** — see [`docs/PR_WORKFLOW.md`](../../../docs/PR_WORKFLOW.md).

## Workflow

1. **Check status** — PR state, latest CI, unresolved review threads (filter resolved threads out)
2. **Merge conflicts** — resolve intelligently; preserve intent on both sides. If intents conflict, stop and ask
3. **Comments** — review **inline** comments and CI logs. Ignore bot walkthrough noise unless actionable. Validate bot findings; push back when wrong or uncertain
4. **CI** — fix failures **within this PR's scope**. Never weaken CI/workflows to pass. Never make unrelated code changes to green unrelated failures — report instead. If failure seems unrelated, merge latest base branch first (another PR may have fixed it)
5. **Verify** — push scoped fixes, re-watch CI until mergeable + green + comments triaged
6. **Labs gate** — run `npm run presubmit` locally before pushing substantive fixes
7. **Merge (when authorized)** — if user asked to merge and CI is green: `gh pr merge <n> --squash --delete-branch`, then `git checkout main && git pull`. Merge stacked PRs in dependency order (see PR workflow doc)
8. **Deploy failures** — if `CI/CD` **deploy** failed with GitHub Pages `in progress deployment`, confirm latest `main` deploy succeeded (deploy job retries once after 90s). Do not treat as a code defect unless **test** failed. See [`docs/CI_RELIABILITY.md`](../../../docs/CI_RELIABILITY.md)
9. **Workflow edits** — run `npm run check:workflows` + presubmit; never add a second `deploy-pages` workflow

## Merge bar (solo)

| Block merge                     | OK to merge                                     |
| ------------------------------- | ----------------------------------------------- |
| CI failed                       | CI green on latest commit                       |
| Presubmit not run on HEAD       | Presubmit clean locally                         |
| Unreviewed visual baseline diff | CodeRabbit rate limit / no human review         |
|                                 | Valid bot syntax/logic fix applied or dismissed |

## Boundaries

- Do not commit/push unless the user requested babysitting with push authority
- Do not merge unless the user asked to merge (or babysit **through merge**)
- Ask before expanding scope beyond the PR
- Follow root [`AGENTS.md`](../../../AGENTS.md) § Boundaries
