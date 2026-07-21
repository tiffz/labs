---
name: labs-split-to-prs
description: Splits current Labs work into small reviewable pull requests with recoverable git snapshots. Use when the user asks to split a chat, branch, changeset, or PR into multiple PRs.
---

<!-- AUTO-GENERATED from .agents/skills/labs-split-to-prs/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs split to PRs

Turn one pile of work into a few small PRs.

## Hard rules

- Do **not** create branches, commit, push, or open PRs until the user approves the split plan
- Never discard user work — no destructive git (`reset --hard`, `clean -fdx`, branch deletion, force-push, history rewrite) without explicit approval
- Save a recoverable snapshot before moving work (dirty `main` is common)
- Stage only named files or hunks — no `git add .` / `git add -A`

## 1. Check state

Compare current work to the default branch (committed + uncommitted). Summarize real slices; use chat history for intent. Check ownership signals (`CODEOWNERS`, repo equivalents) for reviewer boundaries.

## 2. Propose split

- PR titles usually enough; one-line scope when unclear
- Mermaid diagram when multiple slices
- Optimize for reviewer-aligned PRs with minimal unrelated diff
- Default independent PRs off default branch; stack only when dependency is real
- **Ask for approval before executing**

## 3. Execute

Save snapshot without changing working tree:

```bash
SHA=$(git stash create "pre-split")
if [ -n "$SHA" ]; then
  git update-ref "refs/backup/pre-split-$(date +%s)" "$SHA"
fi
```

For each approved slice: branch from right base → stage/commit planned files only → push → open PR (`gh pr create`).

## 4. Report back

PR titles and URLs; anything left on starting branch/working tree. Do not delete backup ref unless user asks.

**Merge order:** merge PRs in dependency order (foundation first); see [`docs/PR_WORKFLOW.md`](../../../docs/PR_WORKFLOW.md).

## Labs verify

Each slice that touches code: `npm run presubmit` before opening PR.
