---
description: Major changes pass senior-reviewer gates at the right lifecycle stage — PM (proposal), architecture (design), UX and QA (pre-merge) — right-sized by the app's quality tier
alwaysApply: true
---

# Major-change review gates (hard gate)

Major work runs a senior reviewer at the stage where it pays off. Each gate is a
read-only subagent that **finds**; you verify and fix. These sit above the per-PR
[`labs-local-review`](../skills/labs-local-review/SKILL.md) trio (code / product /
guidance), which still runs at every merge.

## The lifecycle

| Stage                      | Gate                                                                      | Run when                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proposal                   | [`labs-pm-review`](../skills/labs-pm-review/SKILL.md)                     | A net-new app, a major feature, a new data model, or anything that overlaps an app's domain — **before** design. Judges audience, scope, portfolio fit. |
| Technical design           | [`labs-architecture-review`](../skills/labs-architecture-review/SKILL.md) | A net-new app/subsystem, a new synced data model, a `src/shared/**` interface, or a significant refactor — after the proposal, **before** build.        |
| Design-time journey        | [`labs-ux-journey`](../skills/labs-ux-journey/SKILL.md)                   | Non-trivial UI, before UI code (see `ux-journey-mandatory`).                                                                                            |
| Pre-merge, major UX change | [`labs-ux-review`](../skills/labs-ux-review/SKILL.md)                     | New screen/flow/redesign, shared-UI or theming change — audits the rendered UI.                                                                         |
| Pre-merge, major feature   | [`labs-qa-review`](../skills/labs-qa-review/SKILL.md)                     | New capability, sync/data-model, audio, undo — stress-tests the running app; bugs become regression tests.                                              |
| Every merge                | [`labs-local-review`](../skills/labs-local-review/SKILL.md)               | The three-reviewer diff gate (ADR 0023).                                                                                                                |

Rationale and how these relate to the merge trio: [ADR 0024](../../docs/adr/0024-major-change-ux-qa-review-gates.md).

## Right-size by app quality tier

Before choosing how much rigor to apply, read the touched app's tier in
[`docs/app-quality-tiers.json`](../../docs/app-quality-tiers.json) (rubric:
[`docs/APP_QUALITY_TIERS.md`](../../docs/APP_QUALITY_TIERS.md)). Tier is
regression-criticality from usage + owner intent, **independent of public listing** —
Encore is `unlisted` but `protected`.

- **`protected`** (e.g. drums, encore, count) — run the applicable gates in full; treat visual/e2e as blocking; never weaken a guardrail; no sweeping rewrite without an architecture pass.
- **`standard`** — the usual right-sizing.
- **`experimental`** (e.g. melodia, muscle, sight) — move fast; sweeping changes are fine with minimal testing; skip the heavy gates.

Skip all major-change gates for bug fixes, polish, docs, and clearly-in-scope small
work. When unsure whether a change is "major", the tier decides: on a `protected`
app, prefer running the gate.

Root cause classes: `product-scope-drift`, `architecture-review-gap`, `ux-design-review-gap`, `qa-escaped-defect`.
