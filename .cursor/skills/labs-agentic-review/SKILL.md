---
name: labs-agentic-review
description: Agentic best-practices gate for the repo's own agent guidance — spawn the read-only labs-review-agentic subagent to audit new or changed subagent definitions, skills, and rules for single responsibility, trigger precision, output contract, read-only enforcement, tool minimalism, no conflicts, sourced-not-duplicated, right altitude, anti-fabrication, and generated-file sync. Use when adding or editing anything under .agents/ or .claude/agents/, or to audit the whole agent-guidance surface.
---

<!-- AUTO-GENERATED from .agents/skills/labs-agentic-review/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs agentic review

A gate on the repo's **own agent guidance**. When you add or change a subagent,
skill, or rule, a reviewer (`labs-review-agentic`) audits it against agentic best
practices so the guidance surface stays small, focused, and free of drift. Agent
instructions are load-bearing here — a vague trigger misfires, a duplicated policy
drifts, a bloated rule crowds context — so they get reviewed like code.

## When to run

- Adding or editing a `.claude/agents/*.md` subagent, a `.agents/skills/*` skill, or a `.agents/rules/*.md` rule.
- Before merging a change that expands the agent-guidance surface (a batch of new reviewers, a new gate).
- On demand, to audit the whole surface for overlap, drift, and bloat.

## 1. Scope

```bash
git fetch origin main --quiet
git diff --stat origin/main...HEAD
```

Note the added/changed guidance files and the siblings they could overlap.

## 2. Spawn the reviewer

Spawn `labs-review-agentic` (read-only) with the scope. It applies the 12-point
rubric (single responsibility, trigger precision, output contract, read-only
enforced, tool minimalism, no conflicts, sourced-not-duplicated, right altitude,
anti-fabrication, context discipline, generated-file sync, codification fit).
Grounding: `references/agentic-best-practices.md`.

## 3. Verify and gate

Confirm each finding against the file and the canon it cites (`AGENTS.md`, ADRs,
`docs/SOURCE_OF_TRUTH.md`). Fix BLOCKERs (a duplicate/overlapping agent, a reviewer
that can edit, a contradiction with an ADR, or `.agents/` changed without
regeneration) and SHOULD-FIXes before merge. Then run the guidance gates the review
maps onto:

```bash
npm run generate:agent-guidance   # regenerate .cursor/ and .claude/ from .agents/
npm run check:agent-docs          # skills frontmatter, README rows, AGENTS.md refs
npm run check:agent-guidance      # generated copies match source
```

## 4. Stress-test new reviewers (dogfood)

When the change adds reviewer subagents, run this gate **on the new reviewers
themselves** before shipping them — a reviewer that cannot pass its own rubric
should not review others. Common self-findings to check: a `description` with a
`": "` that breaks YAML; a stated-but-not-tool-enforced read-only boundary; a lens
that overlaps an existing reviewer; policy restated instead of linked.

## Notes

- Reviewer definition: [`.claude/agents/labs-review-agentic.md`](../../../.claude/agents/labs-review-agentic.md).
- The agent-guidance system it protects: [`AGENTS.md`](../../../AGENTS.md), [`.agents/rules/README.md`](../../rules/README.md), [`.agents/skills/README.md`](../README.md), [ADR 0023](../../../docs/adr/0023-local-review-merge-gate.md) (the three-reviewer cap), [ADR 0024](../../../docs/adr/0024-major-change-ux-qa-review-gates.md) (the conditional gates).
- `.agents/` is the source of truth; `.cursor/` and `.claude/rules|skills` are generated. `.claude/agents/` is hand-authored and outside the generate pipeline.
