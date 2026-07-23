# ADR 0024: Senior-reviewer gates for major changes across the lifecycle

## Status

Accepted (July 2026)

## Context

[ADR 0023](./0023-local-review-merge-gate.md) put a three-reviewer gate
(`labs-review-code` / `labs-review-product` / `labs-review-guidance`) at **merge
time**, reviewing a **diff**. It deliberately caps at three: "three is the ceiling
before the lenses overlap."

But the diff-at-merge gate is the wrong shape for some judgments, and the wrong
time for others:

- **Product judgment** — whether a thing should exist, for whom, and at what scope —
  is cheapest **before** any code, and is about an idea, not a diff.
- **Architecture judgment** — the one-way-door decisions in a data model or a shared
  interface — is cheapest at **design time**, before the build commits to them.
- **A deep UX critique** of the **rendered** UI, and a **QA stress-test** of the
  **running** app, are heavier than a fast diff lens and only pay off on **major**
  changes — running them on every trivial PR would be waste.

Folding these into the ADR-0023 trio would blow the three-lens cap and slow every
merge. They are different in kind (idea, design, rendered UI, running app — not a
diff) and fire at different lifecycle stages.

A related need: not every app deserves the same rigor. Usage differs by orders of
magnitude, and an app's public listing does not track its importance — Encore is
`unlisted` (private) yet carries nearly all of the owner's singing practice.

## Decision

Add **conditional, lifecycle-staged senior-reviewer gates** that sit _above_ the
ADR-0023 trio (which still runs at every merge). Each is a read-only subagent that
**finds**; the orchestrator verifies and fixes. They run only for **major** changes,
right-sized by the touched app's **quality tier**.

| Stage                      | Gate                                                                                 | Reviewer                   |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| Proposal                   | [`labs-pm-review`](../../.agents/skills/labs-pm-review/SKILL.md)                     | `labs-review-pm`           |
| Technical design           | [`labs-architecture-review`](../../.agents/skills/labs-architecture-review/SKILL.md) | `labs-review-architecture` |
| Pre-merge, major UX change | [`labs-ux-review`](../../.agents/skills/labs-ux-review/SKILL.md)                     | `labs-review-ux-design`    |
| Pre-merge, major feature   | [`labs-qa-review`](../../.agents/skills/labs-qa-review/SKILL.md)                     | `labs-review-qa`           |

The always-apply rule [`major-change-review-gates.md`](../../.agents/rules/major-change-review-gates.md)
defines when each fires. The **app quality tier**
([`docs/APP_QUALITY_TIERS.md`](../APP_QUALITY_TIERS.md), machine-readable in
`docs/app-quality-tiers.json`, refreshed from Google Analytics by
`scripts/fetch-app-usage.mjs`) sets rigor: `protected` apps get the full gates and
blocking coverage; `experimental` apps move fast with minimal testing. Tier is
regression-criticality from usage plus owner intent, **independent of the public
`stage`**.

Two supporting reviewers keep the system honest:

- `labs-review-code` gains explicit **tech-debt** and **unintended/out-of-scope
  change** lenses (the senior-engineer eye), staying the per-PR trio's code lens.
- `labs-review-agentic` ([`labs-agentic-review`](../../.agents/skills/labs-agentic-review/SKILL.md))
  audits the agent guidance itself against agentic best practices, so this growing
  reviewer surface stays focused and drift-free.

Relationship to ADR 0023: the trio is unchanged and still the merge gate. These
gates are **upstream and conditional**, not a fourth trio member — so the
"three is the ceiling" reasoning holds. They keep the ADR-0023 discipline: read-only
reviewers, orchestrator verifies against reality, high-risk changes get an
adversarial pass, findings are Blocker / Should-fix / Consider.

## Consequences

- Judgment lands where it is cheapest: scope at proposal, one-way doors at design,
  rendered-UI and running-app quality before merge — not all crammed into the diff.
- Cost is controlled: gates are conditional on "major" and tier, so trivial and
  `experimental`-tier work is not slowed.
- The reviewer roster grows to eight subagents. `labs-review-agentic` plus the
  agentic-guidance rule exist precisely to keep that roster from sprawling or
  drifting; the roster is capped by need, and each new reviewer must pass its own
  agentic review.
- Quality effort follows real usage, and correctly protects private-but-critical
  apps that the public listing would misclassify.

## Alternatives considered

- **Add QA/UX/PM/architecture as more merge-time trio members.** Rejected: breaks the
  ADR-0023 three-lens cap, reviews a diff when the judgment needs an idea / design /
  running app, and slows every merge including trivial ones.
- **One mega-reviewer for "everything".** Rejected: violates single-responsibility;
  a broad lens reviews everything shallowly (the agentic best-practice this repo now
  audits for).
- **Tier by the manifest `stage` field.** Rejected: `stage` is public visibility, not
  criticality — it misclassifies private-but-critical apps like Encore.
