# Agentic best practices — reference

The principles the `labs-review-agentic` subagent audits against, distilled from
Anthropic's guidance on subagents, skills, tools, and context engineering, and from
the Labs house style. Cite the principle when you file a finding.

## Anthropic guidance (sources)

- **Subagents** — design focused subagents (each excels at **one** task); write
  detailed `description`s (Claude uses them to decide when to delegate); **limit
  tool access** to only what the job needs; check them into version control.
  (code.claude.com/docs — sub-agents.)
- **Context engineering** — context is finite and degrades as it fills
  ("context rot"). Give an agent exactly the context it needs; let it explore
  widely but **return a condensed summary** (≈1–2k tokens), and reference
  identifiers (paths, links) instead of inlining detail.
  (anthropic.com/engineering/effective-context-engineering-for-ai-agents.)
- **Tools for agents** — more tools ≠ better; return meaningful, token-efficient
  results; prompt-engineer tool/agent descriptions as if onboarding a teammate;
  evaluate against real tasks. (anthropic.com/engineering/writing-tools-for-agents.)
- **Agent Skills** — **progressive disclosure**: frontmatter (`name`,
  `description`) is preloaded so Claude knows _when_ to trigger; the body and
  bundled files load **only on demand**. Keep the core file lean; split overflow
  into referenced files; make skills composable.
  (anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills.)
- **Claude Code best practices** — keep `CLAUDE.md`/rules concise and
  human-readable; curate what earns a place in context rather than accumulating.
  (anthropic.com/engineering/claude-code-best-practices.)

## The 12-point rubric

1. **Single responsibility** — one lens per agent/skill; overlap → SHOULD-FIX, a lensless duplicate → BLOCKER. ADR 0023 caps the merge trio at three.
2. **Trigger precision** — `description` is a clear when-to-use, distinguishable from siblings.
3. **Output contract** — reviewers define severity + anchor + confidence + "clean is valid."
4. **Read-only enforced** — said in prose _and_ `tools` exclude `Write`/`Edit`; an editing reviewer → BLOCKER.
5. **Tool minimalism** — only the tools the job needs.
6. **No conflicting instructions** — nothing contradicts `AGENTS.md`, an ADR, `SOURCE_OF_TRUTH.md`, or a nearer rule.
7. **Sourced, not duplicated** — cite canonical docs/rules; restated policy drifts (`guidance-drift`).
8. **Right altitude** — enough to act, not an essay; not so thin it cannot be acted on.
9. **Anti-fabrication + verification** — "do not invent findings," anchor claims, default skeptical.
10. **Context discipline** — condensed ranked output; progressive disclosure, not inlined bulk.
11. **Generated-file sync** — `.agents/` edits regenerated into `.cursor/`+`.claude/`; new skill in the README and referenced in `AGENTS.md`.
12. **Codification fit** — a check a machine runs beats a paragraph an agent must remember; prefer test/ratchet/rule over a new agent when either would do (`CONTINUOUS_PROCESS_IMPROVEMENT.md` ladder).

## Good vs bad reviewer prompt

| Dimension        | Good                                          | Bad                               |
| ---------------- | --------------------------------------------- | --------------------------------- |
| Persona          | one clear role, fresh-eyes framing            | "helpful assistant"               |
| Scope            | exact diff command + which docs to read       | "review the code"                 |
| Output           | fixed severity schema + confidence            | free-form prose                   |
| Boundary         | "read-only" + minimal `tools`                 | broad grant, can mutate           |
| Anti-fabrication | "clean review is valid; anchor to path:line"  | pressure to always find something |
| Verification     | "confirm against the code, default skeptical" | ships first impression            |
| Context          | condensed ranked list, load on demand         | dumps everything inline           |

## Labs house style (match it)

Frontmatter `name` (lowercase-hyphen) + detailed `description` (the lens + "usable
on its own" + "Does not edit files.") + `tools: Read, Grep, Glob, Bash`. Body: a
one-sentence persona with the fresh-eyes framing; an explicit **"You are
read-only."**; `## Scope` with the `git diff origin/main...HEAD` command and the
docs to read; `## What to look for` citing named local invariants rather than
re-explaining them; `## Output` with the `[BLOCKER|SHOULD-FIX|CONSIDER]` block and
severity definitions; and an anti-fabrication close ("a clean review is a valid
result"). Reviewers only find; the orchestrator verifies and fixes (ADR 0023). Keep
`description`s free of an unquoted `": "` — it breaks the YAML frontmatter parser.
