# The quality system — a positive feedback loop

This is the systems view of code quality for Labs: how the parts fit together so
that **every cycle leaves the codebase a little better, and no attribute
silently degrades.** Individual mechanisms (ratchets, gates, rules, the review
subagents) are documented elsewhere; this doc explains how they compose into a
loop, and how to extend it when a new failure mode appears.

If you only read one line: **quality is not a state you reach, it is a loop you
keep turning.** Each turn should hold or raise every attribute below. A turn
that lowers one silently is the thing this system exists to prevent.

## The two loops (Thinking in Systems)

**Reinforcing loop — quality compounds up.** A session finds a problem → the
retrospective names its root-cause class → the learning is codified as a test,
ratchet, rule, or doc → the next session starts from that higher floor and finds
the next problem. Left alone, this loop raises the floor a little every cycle.
Canonical drivers: [`labs-session-retrospective`](../.agents/skills/labs-session-retrospective/SKILL.md),
codify-on-second-occurrence ([`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md)).

**Balancing loops — ratchets resist decay.** Left to entropy, every attribute
drifts down (perf creeps, copy rots, cycles form, coverage thins). Each ratchet
is a balancing loop pinned to a baseline that **only moves the good way**: the
gate fails if a change would cross the floor, and the baseline updates only when
a change legitimately raises it. Bundle size, Lighthouse floors, the duplication
ratchet, the cycle allowlist, and the CSS-`!important` baseline all work this
way.

The keystone that closes both loops on every change: the **merge gate**
([`labs-local-review`](../.agents/skills/labs-local-review/SKILL.md), [ADR 0023](adr/0023-local-review-merge-gate.md)) —
three fresh-context reviewers (code / product / guidance) plus the automated
gates run before merge to `main`, so a regression in any attribute has to get
past both a machine and an independent opinion.

## The quality-attribute matrix

Every attribute needs four things, or it drifts: a **measure** (how we know), a
**ratchet or gate** (what stops regression), **guidance** (how agents improve
it), and a **codification path** (how a new failure mode becomes durable). Gaps
in this table are where quality can silently decay — fill them.

| Attribute              | Measure                                                                                                              | Ratchet / gate                                                                                                    | Guidance                                                                                                   | Codify on failure via                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Performance**        | Lighthouse per-app floors; bundle-size baseline; interaction-latency budgets; **CLS** (icon-font-layout-shift guard) | `lighthouse-audit.mjs` (baseline − tol, ratchet-only); `bundle-size-report.mjs`; `icon-font-layout-shift.spec.ts` | [`PERFORMANCE.md`](PERFORMANCE.md), [`PERFORMANCE_BUDGETS.md`](PERFORMANCE_BUDGETS.md), `labs-performance` | budget test + root-cause class                |
| **Reliability**        | CI success %; flake registry; cycle allowlist                                                                        | Playwright `retries: 0`; quarantine convention; `sharedModuleCycles.test.ts` (allowlist tightens, never grows)    | [`CI_RELIABILITY.md`](CI_RELIABILITY.md), `flaky-tests.md`                                                 | `FLAKY_TEST_REGISTRY.md` row + root-cause fix |
| **Maintainability**    | knip (dead code); jscpd (duplication); import boundaries; module cycles; container LOC                               | `knip`; `check-jscpd-ratchet.mjs`; `importBoundaries.test.ts`; cycle allowlist                                    | [`COMPONENT_DECOMPOSITION_PATTERN.md`](COMPONENT_DECOMPOSITION_PATTERN.md), boundary rules                 | guardrail test                                |
| **Writing quality**    | `check:ui-copy`; agent-authored prose                                                                                | `check-ui-copy.mjs` (AST-based)                                                                                   | `writing-style.md`, [`USER_COPY_STYLE.md`](USER_COPY_STYLE.md)                                             | copy-check rule                               |
| **Usability / UX**     | journey sketch; review-product lens                                                                                  | `ux-journey-mandatory.md` (hard gate); merge-gate product reviewer                                                | [`UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md), `labs-ux-journey`                                                | UX root-cause class + doc                     |
| **Accuracy (content)** | domain-expert review; **content-integrity tests**                                                                    | curriculum/generator validity tests (see below)                                                                   | [`CONTENT_ACCURACY.md`](CONTENT_ACCURACY.md)                                                               | integrity test + expert-review row            |
| **Accessibility**      | `eslint-plugin-jsx-a11y`; `check:menu-a11y`; `runA11yAudit`                                                          | lint gate; `spaGuardrails.test.ts`                                                                                | `react-a11y.md`, [`A11Y_MENU_PATTERNS.md`](A11Y_MENU_PATTERNS.md)                                          | a11y guardrail                                |
| **Responsive**         | 390px floor; layout heuristics                                                                                       | `responsive-all-apps.spec.ts`; per-app `layout-heuristics-*`                                                      | [`RESPONSIVE_DESIGN.md`](RESPONSIVE_DESIGN.md)                                                             | floor override + smoke                        |
| **Security**           | secret hygiene; OAuth-scope discipline; debug-mode gating                                                            | no-token-log rules; boundary tests                                                                                | `AGENTS.md` § Security                                                                                     | ADR + guardrail                               |
| **Visual correctness** | Linux CI screenshot baselines                                                                                        | `apps.visual.spec.ts` (blocking scoped, advisory cross-cutting)                                                   | `visual-regression-agent.md`, `labs-visual-judge`                                                          | baseline update with audit trail              |

The two weakest columns are the leverage points: **accuracy** (a content bug
teaches a user something wrong and no code gate catches it — see below) and the
**automated UX/usability ratchet** (still mostly human-in-the-loop via the
product reviewer; that is acceptable but it is the least-automated cell).

## Accuracy: the attribute that has no compiler

Correctness of _content_ — a scale's note spelling, a color-match's grading, a
muscle's name — cannot be caught by types, lint, or a screenshot. It is the
attribute most likely to ship wrong and stay wrong. Two mechanisms defend it,
and content-heavy apps must have both:

1. **Content-integrity tests.** Any code that _generates_ user-facing content
   (a curriculum, a score, a quiz, a procedural palette) must have a test that
   asserts **every generated artifact is valid** — not a sample. The Scales app
   shipped 8 exercises that rendered nothing because no test iterated the whole
   curriculum and asserted each produced a non-null, correctly-spelled score.
   One such test would have caught it. See [`CONTENT_ACCURACY.md`](CONTENT_ACCURACY.md).
2. **Domain-expert review.** Periodically (and before any "launch review"),
   route content-heavy apps through a subagent playing the relevant expert — a
   music educator for Scales, a color scientist for Sight, an anatomy educator
   for Muscle. They read the curriculum data and flag what is pedagogically or
   factually wrong. This is part of the launch-review process and catches the
   class of bug that "the app runs fine" hides.

## How a new failure mode enters the system

This is the reinforcing loop in practice. When a session hits a problem:

1. **Name the root-cause class** (reuse a label from `CONTINUOUS_PROCESS_IMPROVEMENT.md` § Root cause classes, or add one).
2. **On the second occurrence in a session — or when the user asks — codify it**
   at the cheapest durable layer that would have prevented it: a test > a
   ratchet > a lint rule > a scoped `.agents/rule` > a doc. Prefer the layer a
   future agent cannot skip.
3. **Attach it to an attribute** in the matrix above, so the defense is findable.
4. **Deliver it in the same PR** through the merge gate.

A learning that stays in a chat log is lost; a learning encoded as a failing
gate defends every future cycle. That difference is the whole system.

## Anti-patterns that break the loop

- **Widening a ratchet to make a change pass.** A floor you lower to fit today's
  regression stops defending tomorrow's. Raise it only when the change genuinely
  improves the metric.
- **Fixing a flake with a retry.** Retries hide the reinforcing loop's input —
  the flake never gets root-caused, and CI trust decays (`flaky-tests.md`).
- **Codifying prematurely.** One occurrence is a fix; the _second_ is a pattern.
  Codifying every one-off grows guidance faster than anyone can read it, which
  is its own decay. Balance implementing over backlog growth.
- **A green CI that measures the wrong thing.** An advisory nobody reads, or a
  gate that passes vacuously, is worse than no gate — it signals safety that
  isn't there. The icon-shift guard refuses to pass if it samples zero icons for
  this reason.

## Related

- [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](CONTINUOUS_PROCESS_IMPROVEMENT.md) — root-cause classes, retrospective policy, codify-on-second-occurrence.
- [`CONTENT_ACCURACY.md`](CONTENT_ACCURACY.md) — the accuracy attribute in detail.
- [ADR 0023](adr/0023-local-review-merge-gate.md) — the merge gate.
- [`PROCESS_BACKLOG.md`](PROCESS_BACKLOG.md) — deferred improvements (open only).
