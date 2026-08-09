---
name: labs-grill-plan
description: Interactive plan pressure-test — one question at a time, grounded in the codebase, to sharpen a rough or half-formed idea before design or build. Use when the user has an ambiguous plan and wants it stress-tested, upstream of labs-ux-journey and labs-architecture-review. Not for finished diffs (that is the review trio).
---

<!-- AUTO-GENERATED from .agents/skills/labs-grill-plan/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs grill plan

A dialogue tool, not a builder. When the user brings a rough idea or a half-formed
plan, grill it — one question at a time, with the user in the loop — until the plan
is sharp enough to hand to design or build. It produces a **sharpened plan, not
code**. Idea adapted from Matt Pocock's MIT-licensed "grill-me" skill; credit
upstream.

This is the interactive **upstream** of the read-only gates. `labs-ux-journey`,
`labs-architecture-review`, and the review trio all critique a finished artifact;
this stress-tests the idea _before_ an artifact exists.

## When to use

- The user has an ambiguous or half-formed plan and wants it pressure-tested before committing to design or build.
- Scope, audience, trade-offs, or reversibility are unclear and worth resolving in conversation.
- Upstream of `labs-ux-journey` (UI shape) and `labs-architecture-review` (technical design).

Skip for trivial or clearly-in-scope work, and for finished diffs — that is
`labs-local-review`. Right-size to the app's quality tier
([`docs/APP_QUALITY_TIERS.md`](../../../docs/APP_QUALITY_TIERS.md)): grill
`protected` apps harder; wave `experimental` ones through.

## How it runs

1. **Explore first.** Read the touched app README/CUJs, the manifest, and the relevant `src/shared/**` before asking anything. Never ask what the repo already answers — ground each question in what you found.
2. **One question per turn** via `AskUserQuestion`. Never a wall of questions. Lead each with the **recommended option first, labeled**, plus a one-line rationale for it (our AskUserQuestion norm).
3. **Walk the tree depth-first.** Follow the consequences of each answer before moving to the next branch — an answer that cuts scope closes the branches under it.
4. **Surface as you go:** hidden assumptions, risks, the cheapest scope cut, and reversibility (one-way vs two-way doors). Name each when it lands, not in a final dump.
5. **Stop at shared understanding** — when the next question would not change the plan. Do not grill for its own sake.

## When done

Summarize the crystallized plan: the job, the agreed scope and named non-goals, the
open one-way-door decisions, and the risks accepted. Then hand off:

- UI shape → `labs-ux-journey` (post the journey sketch).
- Technical design → `labs-architecture-review`; a one-way-door decision → an ADR (`labs-write-adr`).
- Whether the thing should exist at all → `labs-pm-review` (proposal gate).

## Related skills

- `labs-pm-review` — proposal gate: should this exist, for whom, at what scope.
- `labs-ux-journey` — the journey sketch you post; the UI-shape downstream.
- `labs-architecture-review` — design-time technical gate before build.
