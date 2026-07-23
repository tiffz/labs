---
name: labs-pm-review
description: Senior-PM proposal gate — before designing or building a major new product or feature, spawn the read-only labs-review-pm subagent to judge audience and job fit, portfolio fit (new app vs extend, overlap), scope and non-goals, cost vs value to the owner, and decision hygiene, and to read portfolio health. Use at proposal time, upstream of labs-ux-journey and the merge-time gates. Tuned to Labs — a primary audience of one (the owner) plus a small auxiliary audience (a friend, read-only).
---

<!-- AUTO-GENERATED from .agents/skills/labs-pm-review/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs PM review

The earliest gate. Before a journey sketch or a line of code, a senior product
manager (`labs-review-pm`) judges whether a major new product or feature **should
exist, for whom, at what scope, and how it fits the portfolio**. It is different in
kind from the merge-time reviewers: they review a diff; this reviews an **idea**.

The point is product judgment for a portfolio whose primary user is the owner
(success = the owner uses and enjoys it, not reach) and whose auxiliary audience is
a friend as a read-only guest.

## When to run

Run it at **proposal time** for a **major new product or feature** — before
`labs-ux-journey`:

- A net-new micro-app (always — this is the highest-stakes portfolio decision).
- A major new feature or a new synced data model on an existing app.
- A change that overlaps another app's domain, or blurs an app's scope.
- Any time you are unsure whether to build a thing at all, or whether it should be a new app vs an extension.

Skip for bug fixes, polish, and clearly-in-scope small features. When the proposal
is a net-new app or a new data model, run the **full five lenses**; smaller asks get
a light pass (calibrate depth like `labs-local-review`).

## 1. Frame the proposal

State the proposal in one paragraph: the job, the audience, and the rough shape.
If the user has not written one, ask for the job and the primary user first — do not
review a proposal you had to invent.

## 2. Spawn the reviewer

Spawn `labs-review-pm` (read-only) with the proposal and the portfolio context. It
reads `docs/PRODUCT_VISION.md` (the audience + the new-app-vs-extend test),
`src/labsHome/labsCatalog.manifest.json` (the current portfolio), the touched/overlapping
app READMEs and CUJs, and the precedent ADRs (0013 subsume-on-overlap, 0007
one-owner). Framework reference: `references/pm-frameworks.md`.

It returns a **GO / REFINE / NO-GO** verdict across five lenses: audience & job fit;
portfolio fit (new app vs extend, overlap); scope & non-goals; true cost vs
value-to-owner; decision hygiene — plus a portfolio-health note.

## 3. Act on the verdict

- **GO** — carry the recommended scope (primary journey, MVP, explicit non-goals, new-app-or-extend call) into the `labs-ux-journey` sketch and, for a net-new app, `labs-new-micro-app`. The scope statement becomes the shared understanding of what is and is not in this product.
- **REFINE** — sharpen the audience, scope, or new-app-vs-extend call as directed, then re-run or proceed once resolved. If a call is genuinely the owner's to make, `AskQuestion` — do not guess.
- **NO-GO (for now)** — record the decision and its **named re-open trigger** in `docs/TECH_DEBT_ROADMAP.md` § "Consciously skipped (decided, not forgotten)", so the deferral is durable.

## 4. Keep the vision current — how PM review compounds

A proposal review that changes the portfolio should update the portfolio's record:

- A new app or a scope decision → add/adjust its `src/<app>/README.md` purpose + `Audience:` + `## MVP scope` / non-goals, and its `labsCatalog.manifest.json` entry.
- A cross-app boundary or overlap resolution → an ADR (subsume, or one-owner) in the ADR-0013/0007 lineage, and a line in `docs/PRODUCT_VISION.md`.
- A recurring scoping miss → tighten the new-app-vs-extend test or the non-goals convention in `docs/PRODUCT_VISION.md`.

The vision doc is the portfolio's memory. Kept current, each proposal starts from a
clearer picture of what Labs is and is not — which is how the portfolio stays
coherent as it grows.

## Notes

- Gate rationale and lifecycle (proposal → **PM** → journey sketch → build → UX + QA → trio → merge): [ADR 0024](../../../docs/adr/0024-major-change-ux-qa-review-gates.md).
- Reviewer definition: [`.claude/agents/labs-review-pm.md`](../../../.claude/agents/labs-review-pm.md). Claude-native subagent.
- Downstream siblings: [`labs-ux-journey`](../labs-ux-journey/SKILL.md) (design-time journey), [`labs-new-micro-app`](../labs-new-micro-app/SKILL.md) (net-new app build), and the feasibility check in `feasibility-first`.
- Portfolio vision + new-app-vs-extend test: [`docs/PRODUCT_VISION.md`](../../../docs/PRODUCT_VISION.md).
