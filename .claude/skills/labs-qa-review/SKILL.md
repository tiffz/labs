---
name: labs-qa-review
description: QA stress-test gate for major new features — spawn the read-only labs-review-qa subagent to drive the running app with exploratory tours and test heuristics, find bugs/usability/data-loss issues before merge, verify and gate them, and turn every confirmed bug into a permanent regression test. Use once a major feature is functionally complete and before the labs-local-review merge gate. Each escaped-bug class becomes a guardrail, so QA gets cheaper over time.
---

<!-- AUTO-GENERATED from .agents/skills/labs-qa-review/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs QA review

A pre-merge stress test for **major new features**. The trio in `labs-local-review`
reviews the diff; this pass drives the **running app** as a professional tester,
hunting the bugs, edge cases, and data-loss paths the happy-path tests miss. It
runs on a fresh context, so it finds what the author stopped seeing.

It finds; you fix. Nothing it claims blocks the merge until you have reproduced it.
The gate is not "green tests" — it is "a skeptical tester tried to break this and
what they found is fixed or triaged."

## When this gate is required

Run it once the feature is **functionally complete** and before merge when the
change is a **major new feature** — any of:

- A new user-facing capability, screen, or multi-step flow.
- A change to Drive sync / merge / data model, audio scheduling/export, or app-level undo (the `docs/TEST_STRATEGY.md` § Mandatory feature-test matrix classes).
- App-shell / provider / routing / auth wiring, or `src/shared/**` that many apps import.

For these **high-risk** classes it is mandatory and pairs with the adversarial-verify
step. Skip for copy tweaks, docs, and mechanical refactors. When unsure, run a short
charter — a data-loss bug caught here is the whole point.

## 1. Scope

```bash
git fetch origin main --quiet
git diff --stat origin/main...HEAD
```

Note the feature's surfaces, the data entities it touches, and the matching
`.agents/rules/`. Read `src/<app>/CUJs.md` and `docs/TEST_STRATEGY.md` § Mandatory
feature-test matrix — **a matrix class with no test is a Blocker gap before any bug
is found.**

## 2. Spawn the tester

Spawn `labs-review-qa` (read-only) with the scope. Give it one or more **charters**
(one mission each) chosen for the feature — see `references/qa-charter-template.md`
for the format and a starter set. Typical charters for a Labs feature:

- **Saboteur / interruption** — offline mid-action, reload mid-save, tab close/restore, concurrent edits, kill-and-relaunch. Mandatory for anything that syncs.
- **Data-loss** — the stress table in `docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`; canonical assertion: delete on A → pull on B → stays deleted.
- **Boundary / CRUD** — 0/empty/1/N/N+1, huge input, Unicode/emoji, whitespace; create-read-update-delete-list each entity.
- **Usability / a11y** — Nielsen heuristics + keyboard-only + contrast + target size on each new surface.

The tester drives the app (`npm run dev`, `?e2eSeed=1` fixtures, `?debug` +
LabsDebugDock, Playwright or `claude-in-chrome` MCP) and applies the methodology in
`references/qa-methodology.md` (SFDIPOT coverage, Whittaker tours, FEW HICCUPPS
oracles, RCRCRC regression focus).

## 3. Verify, then gate

Reproduce every **Blocker** and **Should-fix** from the tester's steps before you
act on it — a QA finding you cannot reproduce is not yet a finding. For high-risk
changes, run the adversarial-verify pass (3 skeptics try to prove each Blocker
wrong; keep it only if it survives).

Merge only when **both** hold:

- Zero reproduced Blockers remain (data loss, crash/dead-end on a primary journey, security hole, or a missing mandatory-matrix test).
- Every Should-fix is fixed in-branch or explicitly deferred, with a one-line reason, in the PR.

## 4. Codify — how QA compounds

This is the point of the gate. **Every confirmed bug leaves a permanent test in the
same PR** — the `coverage:` line in each finding names it. Follow the
`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md` ladder (cheapest durable layer that would
have caught it):

- Pure logic / merge / undo bug → Vitest (`*Core.ts`, `*Merge.test.ts`, `*Undo*.test.ts`); satisfy the mandatory-matrix row if it is audio/export/sync/undo.
- User-visible integration bug → Playwright smoke in `e2e/smoke/`, registered in `APP_SMOKE_SPECS` (`scripts/run-scoped-e2e.mjs`) + `e2e/routeRegistry.ts`, linked from `src/<app>/CUJs.md`.
- "Fixed 1 of N" class bug → a `*Guardrails.test.ts` that enumerates **all** surfaces, not a point-fix (`single-surface-guard` lesson).
- Visual / audio regression → Linux-CI baseline PNG or SHA-256 audio hash.

Name the **root-cause class**; on the second occurrence of a class, the durable
artifact is mandatory — do not wait for a third. A bug fixed without a test is a bug
that returns; a bug turned into a failing gate is caught for every future feature.
That compounding is why QA gets cheaper, not more expensive, over time.

## 5. Record and merge

Post the verdict as a PR comment: charters run, bugs found, what you fixed, what
you deferred and why, and the tests you added. Re-run the new + scoped tests and one
`presubmit` before merging.

## Notes

- Gate rationale and lifecycle placement (proposal → design → build → **UX + QA** → trio → merge): [ADR 0024](../../../docs/adr/0024-major-change-ux-qa-review-gates.md), [ADR 0023](../../../docs/adr/0023-local-review-merge-gate.md).
- Reviewer definition: [`.claude/agents/labs-review-qa.md`](../../../.claude/agents/labs-review-qa.md). Claude-native subagent.
- Interaction-ms budgets and headless-WebGL frame-times are **advisory** in this repo (`docs/TEST_STRATEGY.md` § Low-ROI): assert the functional outcome, never a raw `expect(ms)` threshold.
- Reviewers are **read-only**; you apply fixes and add the tests, then re-clear the gates.
