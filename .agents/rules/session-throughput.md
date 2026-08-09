---
description: Keep multi-bug agent sessions short — spike first, batch spot-checks, split PRs
alwaysApply: true
---

# Session throughput

For **multi-bug / upgrade / spot-check** sessions, optimize for wall-clock and tokens:

1. **Spike before thrash** — one Playwright/CDP or unit repro that falsifies the hypothesis before editing a second subsystem. Prefer computed style / pixel pads over vision captions for clip/theme bugs.
   - **Layout and CSS hypotheses are cheap to test and expensive to guess.** Reading the cascade and predicting a fix has a poor hit rate: specificity maths said a `min-height` would fix an icon clip (it was a no-op — the guard wanted a font-size ratio), and an unreserved `#root` height looked like Zine Box's CLS (it measured identical, and the real cause was a loading state with `margin: 56px` and no height). Both cost a build-and-measure cycle to disprove. **Script the measurement first.**
   - **CLS recipe:** `PerformanceObserver` on `layout-shift` with `buffered: true`, then read `entry.sources[].node` plus `previousRect`/`currentRect` for the element and delta. Polling after load misses it — the shift usually lands in the first few frames.
   - Measure on `vite preview`, not the dev server: unbundled module loading distorts timing. CLS values themselves are geometry ratios and hold across both.
2. **Check `cascade-layer-token-override` early** after Tailwind `@layer` or MUI shared-CSS work (unlayered shared CSS beats layered app tokens).
3. **Timebox upgrade spot-checks** — smoke a small app set, then stop and split remaining bugs into follow-ups (`labs-split-to-prs`).
4. **Run the cheap gates before you commit, not by failing the expensive ones.**
   `npm run verify:quick` (~7s: ui-copy, knip-exports ratchet, react-hooks ratchet, agent-guidance,
   typecheck) catches most of what a pre-commit or pre-push hook would, at 1/60th the cost. In one
   session three separate pushes died on gates in that list, each after a full 90-500s presubmit
   had already run. The hook is a backstop, not a discovery mechanism.
5. **Batch commits.** `.husky/pre-commit` runs lint-staged + knip + typecheck + scoped Vitest, and
   `pre-push` runs the whole presubmit (380-520s, over its own 300s budget because
   `test:changed-apps` falls back to the full suite whenever `src/shared/**` is touched). Ten small
   commits and five pushes is roughly an hour of gate time. Group related work into one commit.
6. **Never edit the working tree while a hook is running** — the hook reads the tree it is
   validating, so a concurrent edit produces a failure that has nothing to do with your change.
   Background the commit/push and wait for it.
7. **Verify a commit landed by checking `HEAD` moved**, not by the exit code of a backgrounded
   `git commit`. A rejected pre-commit hook still leaves files staged and can look like success.
8. **Scoped tests first** — touched-file Vitest/e2e, then one `presubmit`. Do not babysit unrelated dirty-tree failures.
9. **Check for parallel-agent ownership before starting** — in a shared / multi-worktree setup (a coordinator running parallel sessions, a `dev-integration` trunk, sibling `.claude/worktrees/*`), run `git worktree list`, `git branch -a`, and `git log dev-integration` **first**. If a branch is already checked out in another worktree or a fix already sits on the trunk, it is owned — do not duplicate it. Duplicating owned work (a bug fix, an audit, a PR conflict-resolve) is pure waste and can collide. Root cause class: `parallel-worktree-duplication`.
10. **A broken dev environment is a bug to fix, not to route around.** If a route freezes / errors / won't render for you, do not offload the verification to the user as "manual testing" — the same breakage hits them. Fix the dev-env issue (or spike a lighter repro path), then verify yourself. Handing a user a checklist of manual-verify tasks to work around your broken dev loop is a process failure. Root cause class: `verification-offloaded`.
11. **Codify on second occurrence** of the same root-cause class in-session (test/doc/rule) — see [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md) § Session throughput.

Root cause classes: `local-ci-gate-drift` (a blocking CI job with no presubmit counterpart — guarded by `src/shared/ciPresubmitParity.test.ts`) · `gate-discovered-by-failing` · `session-thrash` when the same bug class is rediscovered without a spike.
