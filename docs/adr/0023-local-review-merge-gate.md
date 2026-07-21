# ADR 0023: Local-review merge gate for `main`

## Status

Accepted (July 2026)

## Context

Merging to `main` had been ask-first: an agent proposed a merge and a human
approved it. That put the human in the loop for the mechanical merge, not for
the judgment — and the judgment (does this change regress something, break a
convention, or ship a UX misstep?) is exactly what CI does not check. CI
catches type errors, test failures, and lint; it does not catch a redundant
banner stack, a stale guidance link, or a race a diff invites.

The repo already has the pieces of a review discipline scattered across skills
(`labs-visual-judge`, `labs-ux-journey`) and rules, but no single pre-merge gate
that applies them together with an independent perspective.

## Decision

Merging a branch to `main` is allowed once the **[`labs-local-review`](../../.agents/skills/labs-local-review/SKILL.md)**
gate is green. Without that gate, merge stays ask-first ([`AGENTS.md`](../../AGENTS.md)
§ Boundaries).

The gate runs three **read-only** reviewer subagents in parallel, each with
fresh context so it reviews as an outsider, not as the author:

1. `labs-review-code` — correctness, regressions, architecture, tests, perf.
2. `labs-review-product` — UX, journey, redundancy, copy, design-spec adherence.
3. `labs-review-guidance` — repo conventions, precedence, guidance drift.

Findings are severity-ranked (Blocker / Should-fix / Consider). The orchestrator
(the main agent) **verifies each Blocker and Should-fix against the code before
it can gate** — independent agents are confidently wrong too — and high-risk
changes (shells, providers, data-loss surfaces) add an adversarial pass where
skeptics try to refute each Blocker. The gate opens only with zero verified
Blockers and every Should-fix fixed or deferred-with-reason on the PR.

Reviewers never edit; the orchestrator applies fixes, so the reviewed tree
stays the tree that merges.

**Role split, not one reviewer:** a correctness bug, a UX-redundancy violation,
and a guidance drift are found by different kinds of looking. One agent covering
all three does each shallowly; three focused agents each go deep. Three is the
ceiling before the lenses overlap.

**Where it lives:** the process is a tool-agnostic skill so Cursor gets it too;
the three reviewers are Claude-native subagents (`.claude/agents/*.md`), a Claude
Code feature with no Cursor equivalent — like `.claude/settings.json`.

## Consequences

- An agent may merge to `main` after a green gate without a per-merge human
  approval; the human's judgment moved up-front into the review policy.
- The gate sits **before** CI and `presubmit`, not instead of them. Branch
  protection still requires CI green; merge is armed as auto-merge-on-green.
- New reviewer lenses are added as `.claude/agents/*.md` and referenced from the
  skill; the review criteria stay sourced from the existing rules and docs, not
  duplicated, to avoid `guidance-drift`.
- The named subagent types register at session start, so a session that just
  created them runs the review via equivalent `general-purpose` agents pointed
  at the same definition files.

## Alternatives

- **Keep ask-first merges.** Rejected: it spent human attention on the merge
  mechanics rather than the judgment, and scaled poorly across many small PRs.
- **A single all-in-one reviewer.** Rejected: shallow coverage per dimension;
  the distinct failure modes want distinct lenses.
- **Rely on CI alone.** Rejected: CI does not evaluate design, redundancy,
  convention drift, or judgment.

## References

- Skill: [`.agents/skills/labs-local-review/SKILL.md`](../../.agents/skills/labs-local-review/SKILL.md)
- Reviewers: [`.claude/agents/labs-review-code.md`](../../.claude/agents/labs-review-code.md),
  [`labs-review-product.md`](../../.claude/agents/labs-review-product.md),
  [`labs-review-guidance.md`](../../.claude/agents/labs-review-guidance.md)
- [`AGENTS.md`](../../AGENTS.md) § Boundaries — merge-to-`main` policy
- [`docs/PR_WORKFLOW.md`](../PR_WORKFLOW.md) — CI-without-blocking and auto-merge
