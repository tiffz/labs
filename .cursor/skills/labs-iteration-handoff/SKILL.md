---
name: labs-iteration-handoff
description: Records mid-refactor state for the next agent or human session. Use when stopping mid-decomposition, multi-PR refactor, or when the user asks for an iteration handoff.
---

# Labs iteration handoff

## When

Stopping before a refactor/decomposition is merge-ready; next person needs context.

## Record (bullets)

1. **Goal** — one sentence
2. **Done** — files/commits landed
3. **Next** — exact next file/step (e.g. "extract SessionScreen helpers step 2")
4. **Blockers** — tests failing, snapshots, open decisions
5. **Verify** — commands run (`npm run presubmit`, specific e2e)

## Do not conflate

| Type                  | Skill / doc                   |
| --------------------- | ----------------------------- |
| Iteration handoff     | This skill                    |
| Process retrospective | `labs-session-retrospective`  |
| Bug-fix handoff       | PR template § Bug-fix handoff |

## References

- [`DEVELOPMENT.md`](../../../DEVELOPMENT.md) § Iteration handoff
- Large splits: `labs-component-decomposition`
