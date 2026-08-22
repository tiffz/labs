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

On FAIL: `npm run report:ci-failure -- <run-id>`; fix within PR scope (never weaken CI, never `--no-verify`); a failing **visual** step → skill [`labs-visual-judge`](../skills/labs-visual-judge/SKILL.md); suspected flake → merge latest `main` first ([`docs/FLAKY_TESTS.md`](../../docs/FLAKY_TESTS.md)).

Full procedure, when to babysit synchronously (user asked / hotfix / last action), and handoff honesty (watchers die with the session; auto-merge still covers success; never report unobserved green): [`docs/PR_WORKFLOW.md`](../../docs/PR_WORKFLOW.md) § CI without blocking the session + skill [`labs-babysit-pr`](../skills/labs-babysit-pr/SKILL.md). Root cause class: `ci-blocking-idle`.
