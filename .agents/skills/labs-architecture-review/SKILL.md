---
name: labs-architecture-review
description: Senior-architect design gate for major technical initiatives — spawn the read-only labs-review-architecture subagent to review the technical design before build, judging requirements fit, decisions and alternatives, reversibility, interfaces, data model, failure modes, the -ilities, and simplicity, then capture accepted decisions as an ADR. Use after the product proposal is agreed and before build, for a net-new app, a new subsystem or synced data model, a shared-layer change, or a significant refactor.
---

# Labs architecture review

A design-time gate for **major technical initiatives**. After the product is
agreed (`labs-pm-review`) and before code, a senior architect
(`labs-review-architecture`) reviews the **design and its decisions** — not a diff.
The point is to get the one-way-door decisions right while they are still cheap to
change, and to protect the data model and the shared layer from churn.

It finds; you decide. A design finding is a recommendation to weigh, not a build
blocker on its own — but a BLOCKER on a one-way-door decision should change the
design before code starts.

## When to run

Run it after the proposal is agreed and before build, for a **major initiative** —
any of:

- A net-new micro-app or a new subsystem.
- A new synced data model, a new sync/merge path, or a change to a data-loss defense (highest scrutiny — `docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`).
- A `src/shared/**` interface many apps will import, or a new cross-cutting pattern.
- A significant refactor of an existing architecture.
- A dependency choice that will spread through the codebase.

Skip for app-local, easily-reversible (two-way-door) changes and routine features.
Calibrate depth to reversibility and the app's quality tier
(`docs/APP_QUALITY_TIERS.md`): a Protected-tier app or a one-way-door decision gets
the full pass; a two-way door on an Experimental-tier app gets a light look or none.

## 1. Frame the design

Write the design down first — a short design doc or a draft ADR: the problem, the
key decisions with their alternatives, the interfaces and data model, the failure
modes, and the rollout. A review needs a design to review; do not review an
approach that lives only in your head.

## 2. Spawn the reviewer

Spawn `labs-review-architecture` (read-only) with the design and the technical
context. It classifies each decision's reversibility and applies the architecture
lens: requirements fit, decisions + alternatives, interfaces/contracts, data model +
single source of truth + migration, failure modes, the top -ilities,
simplicity/YAGNI, coupling/dependency direction, and the fitness function that
protects each decision. Framework reference:
`references/architecture-review.md`.

## 3. Resolve and record

Weigh each finding. Resolve every BLOCKER on a one-way-door decision before build —
change the design, or write down why the decision stands. Then **capture the
accepted material decisions as an ADR** (`labs-write-adr`, `docs/adr/`): context,
decision, alternatives, consequences. The ADR is the durable record the merge-time
`labs-review-guidance` reviewer will hold the code to.

## 4. Codify — decisions become fitness functions

An architecture review that names an invariant should leave a way to protect it. For
each load-bearing decision, add the **fitness function** that keeps it from eroding —
a guardrail test, a ratchet, or a boundary test (`importBoundaries.test.ts`,
`check:css-important`, and the `*Guardrails.test.ts` family are the models). A
decision with no automated guard drifts; a decision with a failing gate holds. This
is how architecture review compounds instead of repeating.

## Notes

- Lifecycle (proposal → **architecture** → journey sketch → build → UX + QA → trio → merge) and gate rationale: [ADR 0024](../../../docs/adr/0024-major-change-ux-qa-review-gates.md).
- Reviewer definition: [`.claude/agents/labs-review-architecture.md`](../../../.claude/agents/labs-review-architecture.md). Claude-native subagent.
- ADR authoring: [`labs-write-adr`](../labs-write-adr/SKILL.md), [`docs/adr/README.md`](../../../docs/adr/README.md). Merge-time code lens: `.claude/agents/labs-review-code.md`.
