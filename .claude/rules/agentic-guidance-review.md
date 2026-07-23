---
paths:
  - '.agents/rules/**'
  - '.agents/skills/**'
  - '.claude/agents/**'
---

<!-- AUTO-GENERATED from .agents/rules/agentic-guidance-review.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Adding or editing agent guidance (subagents, skills, rules) runs the labs-agentic-review gate and regenerates the tool copies

# Agentic guidance review

Agent instructions are load-bearing — a vague trigger misfires, a duplicated policy
drifts, a bloated rule crowds context. When you add or change a subagent
(`.claude/agents/*.md`), a skill (`.agents/skills/*`), or a rule
(`.agents/rules/*.md`), review the guidance itself and keep the generated copies in
sync.

## Do

1. Run the [`labs-agentic-review`](../skills/labs-agentic-review/SKILL.md) gate (spawn `labs-review-agentic`) against the change — single responsibility, trigger precision, output contract, read-only enforced (a reviewer's `tools` must exclude `Write`/`Edit`), no conflict with `AGENTS.md`/ADRs, sourced-not-duplicated, right altitude, anti-fabrication.
2. Keep `description` frontmatter free of an unquoted `": "` — it breaks the YAML parser (`skills-ref validate`).
3. New skill → add a row to [`.agents/skills/README.md`](../skills/README.md) and reference it in `AGENTS.md`. New rule → add a row to [`.agents/rules/README.md`](README.md).
4. Regenerate and verify:

```bash
npm run generate:agent-guidance   # .agents/ -> .cursor/ and .claude/rules|skills
npm run check:agent-docs
npm run check:agent-guidance
```

## Don't

- Hand-edit `.cursor/rules`, `.cursor/skills`, `.claude/rules`, or `.claude/skills` — they are generated from `.agents/`. (`.claude/agents/` is the exception: hand-authored, not generated.)
- Add a new subagent when a test, ratchet, or rule would enforce the same thing — a machine check beats a paragraph an agent must remember (`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` ladder).

Root cause class: `guidance-bloat` — agent guidance that overlaps, drifts, or crowds context instead of staying small and sourced.
