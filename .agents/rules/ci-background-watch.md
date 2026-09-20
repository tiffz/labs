---
description: Default to non-blocking, background CI/CD after push — keep working, fix on failure
alwaysApply: true
---

# CI/CD is non-blocking by default

After a push/PR, do not sit idle watching CI (~8–15 min). Default flow:

1. **Arm auto-merge:** `gh pr merge <n> --auto --squash --delete-branch`. Branch protection on `main` requires `checks`/`build`/`vitest`/`e2e`, so auto-merge waits for green (admin direct pushes bypass — those rely on `ci:watch`).
2. **Background-watch failures only:** backgrounded `npm run ci:watch -- <n>` (`block_until_ms: 0`, `notify_on_output` pattern `^CI_WATCH: (FAIL|TIMEOUT|ERROR)`). Direct `main` push: `npm run ci:watch -- main`.
3. **Continue the next unit of work** — never `AwaitShell` the watcher or re-poll CI in chat.
4. **When the merge lands, resync the trunk before anything else.** A squash promotion of a
   long-lived branch (`dev-integration`) puts the content on `main` as a brand-new commit and makes
   none of the branch's commits ancestors, so the branch now conflicts with its own shipped work:

   ```bash
   git fetch origin main && git merge origin/main   # resolve --ours, then typecheck before pushing
   ```

   Procedure and the `--ours` caveat: [`docs/PR_WORKFLOW.md`](../../docs/PR_WORKFLOW.md) § Long-lived
   branches must resync. **Do this on the merge notification, not at the next push.** Deferring it
   is what turns one mechanical merge into a conflict discovered mid-push, on unrelated work, hours
   later — four times in a single session. The rule was already written; the failure was doing it
   late. Root cause class: `squash-resync-deferred`.

5. **Cut every branch from `origin/main`, never from the branch you were just on.** The previous
   branch squash-merges, your branch keeps its unsquashed original, and the PR goes `DIRTY` — at
   which point auto-merge silently never fires. This happened three times in one session; the
   third time the fix sat unmerged while the user re-tested the old build and reported the bug
   again. `git fetch origin && git checkout -B <name> origin/main`.
6. **"Armed for auto-merge" is not "shipped".** Before telling the user a fix is ready to re-test,
   confirm the PR is **MERGED** and the deploy **succeeded** for that sha:

   ```bash
   gh pr view <n> --json state,mergeStateStatus     # MERGED, not OPEN/BLOCKED/DIRTY
   gh api repos/{owner}/{repo}/deployments --jq '.[0].sha[0:8]'
   ```

   A `DIRTY` PR never merges on its own. Sending someone to verify a build that does not contain
   the change wastes their time and makes a working fix look broken. Root cause class:
   `reported-unshipped`.

On FAIL: `npm run report:ci-failure -- <run-id>`; fix within PR scope (never weaken CI, never `--no-verify`); a failing **visual** step → skill [`labs-visual-judge`](../skills/labs-visual-judge/SKILL.md); suspected flake → merge latest `main` first ([`docs/FLAKY_TESTS.md`](../../docs/FLAKY_TESTS.md)).

Full procedure, when to babysit synchronously (user asked / hotfix / last action), and handoff honesty (watchers die with the session; auto-merge still covers success; never report unobserved green): [`docs/PR_WORKFLOW.md`](../../docs/PR_WORKFLOW.md) § CI without blocking the session + skill [`labs-babysit-pr`](../skills/labs-babysit-pr/SKILL.md). Root cause class: `ci-blocking-idle`.
