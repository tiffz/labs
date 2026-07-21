---
name: labs-local-review
description: Run a "second opinion" local review before merging to main — spawn three read-only reviewer subagents (code, product, guidance) in parallel, verify their findings against the diff, apply the merge gate, and record the verdict on the PR. Use before merging any branch to main, or on demand when you want an independent review of a change.
---

# Labs local review

A pre-merge gate. The point is a **fresh** opinion: reviewer subagents start with
no memory of writing the code, so they catch what the author stopped seeing.
They only find; you fix. Nothing they claim blocks the merge until you have
checked it against the code yourself — independent agents are confidently wrong
too.

Merge to main is allowed once this gate is green. This is the process that earns
that.

## 1. Scope the change

```bash
git fetch origin main --quiet
git diff --stat origin/main...HEAD        # what moved
git diff origin/main...HEAD               # the review surface
```

Note the touched apps and subsystems, and which [`.agents/rules/`](../../rules/README.md)
match the changed paths (those rules are part of the standard the reviewers apply).

**Right-size the review:**

- **Trivial** (copy-only, docs, a single mechanical rename) — one `labs-review-code`
  pass, or skip with a one-line note in the PR saying why.
- **Standard** (a feature, a bug fix, a refactor) — all three reviewers.
- **High-risk** (app shell / provider / route wiring, Drive-sync or data-loss
  surface, auth, a migration, `src/shared/**` that many apps import) — all three,
  **plus** an adversarial verify pass (step 4).

## 2. Spawn the reviewers in parallel

One message, three `Agent` calls so they run concurrently. Give each the same
diff scope; the subagent type carries the lens.

- `labs-review-code` — correctness, regressions, architecture, tests, perf.
- `labs-review-product` — UX, journey, redundancy, copy, design-spec adherence.
- `labs-review-guidance` — repo conventions, precedence, guidance drift.

Each returns findings as: `[SEVERITY] path:line — claim — why it matters —
suggested fix — confidence`.

Severities:

- **Blocker** — a correctness regression, guardrail violation, security or
  data-loss risk, or a broken critical journey. Must not merge.
- **Should-fix** — a clear best-practice, UX, or convention violation that is
  cheap to fix now.
- **Consider** — a judgment call, a larger refactor, or future work.

## 3. Verify, then synthesize

For every **Blocker** and **Should-fix**, open the cited code and confirm the
claim holds. Discard what does not — a reviewer misreading a guard or inventing
a race is common, and shipping a "fix" for a non-bug is its own regression.
De-duplicate where two lenses found the same thing.

Default skeptical: if you cannot reproduce a claimed Blocker from the code, it is
not a Blocker.

## 4. Adversarial verify (high-risk only)

For each surviving Blocker on a high-risk change, spawn 3 short skeptics (plain
`Agent` calls, or `labs-review-code` with a refute prompt) that each try to prove
the finding **wrong**. Keep the Blocker only if it survives a majority. This
stops a plausible-but-wrong Blocker from holding up a merge — or a real one from
being waved through.

## 5. Apply the gate

Merge only when **both** hold:

- Zero verified Blockers remain.
- Every Should-fix is either fixed in this branch or explicitly deferred, with a
  one-line reason, in the PR.

Consider-items go in the PR as noted follow-ups; they never block.

## 6. Record and merge

Post the synthesized verdict as a PR comment — the findings, what you fixed, what
you deferred and why — so the second opinion is on the record, not just in this
session. Then merge (squash, delete branch).

If you fixed anything in scope, re-run the relevant scoped tests and one
`presubmit` before merging; a review that changes code has to re-clear the gates
it just moved.

## Notes

- Reviewers are **read-only**. If one proposes a diff, you apply it — never let a
  reviewer edit the branch, or the thing under review stops matching what was
  reviewed.
- This gate does not replace CI or `presubmit`; it sits before them and catches
  what tests do not (design, redundancy, drift, judgment).
- Reviewer definitions: [`.claude/agents/labs-review-code.md`](../../../.claude/agents/labs-review-code.md),
  [`labs-review-product.md`](../../../.claude/agents/labs-review-product.md),
  [`labs-review-guidance.md`](../../../.claude/agents/labs-review-guidance.md).
  They are Claude-native subagents; Cursor has no equivalent, so run the steps
  above directly there.
