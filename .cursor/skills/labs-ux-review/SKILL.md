---
name: labs-ux-review
description: Senior-UX-designer review gate for major UX changes — spawn the read-only labs-review-ux-design subagent against the rendered UI, verify its findings, apply the gate, and codify recurring design misses into a lint rule or guardrail. Use before merging a major UX change (new screen, redesign, new flow, shared-UI or theming change), or on demand for a deep design second opinion. Complements the per-PR labs-review-product lens with a deeper, rendered-UI audit.
---

<!-- AUTO-GENERATED from .agents/skills/labs-ux-review/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs UX design review

A pre-merge gate for **major UX changes**. `labs-review-product` gives every PR a
fast UX diff-lens inside `labs-local-review`; this is the deeper, occasional pass:
a senior UX designer looks at the **running** UI and audits it against the named
laws, Material, the app's own spec, and the shared-token contract. The point is a
fresh design eye on the pixels — not the code.

It finds; you fix. Nothing it claims blocks the merge until you have checked it
against the built UI and the app's `DESIGN.md` yourself.

## When this gate is required

Run it before merge when the change is a **major UX change** — any of:

- A new screen, tab, panel, dialog, or multi-step flow.
- A layout restructure, or a redesign of an existing surface.
- A change to `src/shared/**` UI, a shared primitive, or `src/ui/` that many apps inherit.
- A theming change: new/edited app `DESIGN.md`, `appSharedThemes.css`, selection/focus/chrome tokens, or a registered theme divergence.
- The user gave design, gestalt, redundancy, visual-weight, or journey feedback.

Skip for copy-only tweaks, bug fixes restoring documented behavior, and non-UI
changes — those are covered by `labs-review-product` and `check:ui-copy`. When
unsure, run it; the pass is cheap relative to a shipped design regression.

## 1. Scope and prepare the surface

```bash
git fetch origin main --quiet
git diff --stat origin/main...HEAD
```

Note the touched apps. For each, know whether it has a `src/<app>/DESIGN.md`
(its contract) or follows shared Material defaults. **Capture the rendered UI** so
the reviewer sees pixels, not CSS: `npm run dev`, then a Playwright screenshot of
each changed route at **390×844** and **1440×900**, light and dark. Hand those
paths to the reviewer.

## 2. Spawn the reviewer

Spawn `labs-review-ux-design` (read-only) with the diff scope and the screenshot
paths. On a large change, spawn two or three in parallel, each scoped to one app or
surface, so each goes deep. The subagent applies the layered rubric: Laws of UX,
Material + theming, the shared-vs-variety contract, selection/focus/chrome,
writing, a11y, and states/journey.

For the full canon it draws on:

- `references/laws-of-ux.md` — the Laws of UX, grouped, with the review-relevant one-liner for each.
- `references/writing-and-usability.md` — Material Design writing rules, Orwell's rules, and Nielsen's 10 usability heuristics.

## 3. Verify, then gate

For every **Blocker** and **Should-fix**, open the surface (screenshot + code) and
the app's `DESIGN.md`, and confirm the claim holds. **`DESIGN.md` overrides generic
taste** — if the spec allows a thing, it is not a violation (`docs/VISUAL_JUDGE_RUBRIC.md`
T3.3 → not a T1). Discard misreads; independent reviewers are confidently wrong too.

Merge only when **both** hold:

- Zero verified Blockers remain.
- Every Should-fix is fixed in-branch or explicitly deferred, with a one-line
  reason, in the PR.

Consider-items and any major-redesign recommendation go in the PR as follow-ups
for a human decision; they never block.

## 4. Codify — how UX review compounds

A design miss that repeats is a gate that should exist. When the reviewer's finding
maps to a **root-cause class** you have now seen twice (`ux-gestalt`,
`ux-redundancy`, `ux-visual-weight`, `ux-spec-violation`, `ux-journey-overload`,
`ux-design-review-gap`), codify it in the same PR at the cheapest durable layer
(`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` ladder): a `check-*` contract, a visual
guardrail row (`docs/VISUAL_JUDGE_RUBRIC.md`), an ESLint rule, or a line in the
app's `DESIGN.md` / `docs/UX_AGENT_GUIDE.md`. A recurring taste call encoded as a
failing gate defends every future cycle; left in chat it is lost.

## Notes

- Gate rationale and how this relates to the three-reviewer merge gate: [ADR 0024](../../../docs/adr/0024-major-change-ux-qa-review-gates.md), [ADR 0023](../../../docs/adr/0023-local-review-merge-gate.md).
- Reviewer definition: [`.claude/agents/labs-review-ux-design.md`](../../../.claude/agents/labs-review-ux-design.md). Claude-native subagent; in Cursor, run the rubric steps directly.
- Design-time companion (before code): [`labs-ux-journey`](../labs-ux-journey/SKILL.md). This gate is the after-build counterpart.
- Reviewers are **read-only**; you apply fixes, then re-run scoped tests + one `presubmit` before merging.
