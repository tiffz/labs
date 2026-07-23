---
name: labs-architecture-audit
description: Proactively find the most critical latent architecture bugs — the fragile subsystems that breed bug clusters — rather than waiting for a static pattern scan to miss them. Prioritizes subsystems by blast-radius × usage, applies a fragility lens (multiple sources of truth, manual sync invariants, duplicated parallel-path logic, god-files), spawns labs-review-architecture on the worst, and escalates on bug clustering. Use periodically, or the moment a subsystem accumulates a cluster of bugs.
---

<!-- AUTO-GENERATED from .agents/skills/labs-architecture-audit/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs architecture audit

The 2026-07 tech-debt tournament (a static regression-pattern scan) missed the Encore
chart-playback dual-clock fragility that produced six runtime bugs — because no static
pattern reveals "three clocks that must stay in manual lockstep," and nothing was
listening for **bug clustering**. This process closes that gap: it hunts the fragile
subsystems that _breed_ bugs, before the bugs are reported.

Complements — does not replace — the tournament (static patterns), `labs-qa-review`
(runtime bug hunting), and `labs-launch-review` (whole-app). This one targets
**structural fragility in load-bearing subsystems**.

## The strongest signal: bug clustering

When several bugs land in one subsystem, or the same root-cause class recurs there,
that is the loudest "architecture is fragile here" alarm there is. **Escalate to a
systemic `labs-review-architecture` pass of that subsystem before patching the next
symptom** — do not fix face #7 of a six-faced defect. This is the trigger the
tournament lacked.

Threshold: ≥3 bugs in one subsystem within a window, or a recurring root-cause class
(`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`), escalates automatically.

## 1. Prioritize subsystems (blast-radius × usage)

Rank what to audit, worst first:

- **Usage / criticality** — `docs/app-quality-tiers.json` (`protected` first) and the shared layers every app imports (`src/shared/audio/**`, `src/shared/drive/**`, `src/shared/notation/**`).
- **Bug density** — subsystems with a recent bug cluster or recurring root-cause class (the clustering signal above).
- **Churn × size** — the god-files (`git log` hotspots crossed with the size ratchet's biggest entries). High churn on a large file is where fragility hides.

Pick the top 2-4 subsystems; do not boil the ocean.

## 2. Apply the fragility lens

For each, spawn `labs-review-architecture` with the fragility lens
(`references/fragility-signals.md`) — the smells that produced the playback cluster:

- **Multiple sources of truth for one piece of state** — count how many independent places compute/hold "the same" value (position, selection, a merged record). More than one is a boundary where they drift.
- **Manual "must stay in sync" invariants** — two clocks, two stores, two caches, two indices kept aligned by hand rather than by one owner. Each is a bug generator.
- **Duplicated logic across parallel paths** — the same decision made independently in two places (chord vs drum, songs vs performances) that can disagree.
- **No single owner / reconstructed state** — position/selection reconstructed per call from refs instead of owned by one transport/store.
- **Missing fitness function** — a load-bearing invariant with no guardrail test protecting it.

## 3. Verify and rank

Verify each finding against the code (independent reviewers are confidently wrong).
Rank by **blast radius** (how many surfaces/apps a failure touches) × **likelihood**
(how easily the manual invariant drifts). A one-way-door structural defect in a
`protected` shared subsystem outranks a local smell.

## 4. Codify — turn the audit into a durable direction

For each accepted critical finding:

- Write an **ADR** with the incremental fix direction (single owner, one source of truth) — like ADR 0025 (`docs/adr/0025-chart-playback-single-transport.md`) for the playback engine.
- Add the **invariant guardrail tests** that make the class un-reintroducible (single-context assertion, source-of-truth parity, bounded-resource-over-loop, etc.).
- File a ranked row in `docs/TECH_DEBT_ROADMAP.md`.

A fragility named and guarded stops breeding bugs; one left unnamed keeps producing
new faces.

## Notes

- Reviewer: [`.claude/agents/labs-review-architecture.md`](../../../.claude/agents/labs-review-architecture.md). Fragility lens: `references/fragility-signals.md`.
- Case study (why the tournament missed the playback bug): `docs/PLAYBACK_ARCHITECTURE_REVIEW_2026-07.md` (lands with the playback fix).
- Cadence: run alongside the standing regression-pattern review (`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`); the tournament finds static patterns, this finds structural fragility, `labs-qa-review` finds the runtime bugs.
