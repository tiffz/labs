# Architecture review — reference

The frameworks and checklist the `labs-review-architecture` subagent applies.
Named, citable methods, filtered for a solo-maintained web-app portfolio.

## Frameworks

- **Architecture Decision Records (ADR)** — one decision per record: context,
  decision, alternatives, consequences. A material cross-cutting decision with no
  ADR is a gap. Labs: `docs/adr/`, `labs-write-adr`, `.agents/rules/architecture-decisions.mdc`.
- **One-way vs two-way door decisions** (Amazon/Bezos) — classify reversibility
  first. Irreversible (one-way: a data model, a sync contract, a shared interface,
  a public URL/state shape) demands scrutiny and an ADR; reversible (two-way: most
  app-local UI) should be made fast and not over-analyzed. Scale review effort to
  the door, not the line count.
- **Non-functional requirements / the "-ilities"** — performance, scalability,
  security, testability, maintainability, operability. Name the top two or three
  for this design and where they trade against each other; do not grade all equally.
- **Evolutionary architecture + fitness functions** (Ford/Parsons/Kua) — a fitness
  function is any automated check (test, ratchet, boundary test, metric) that keeps
  an architectural characteristic from eroding. Every load-bearing decision should
  name the fitness function that protects it. Labs guardrail tests
  (`importBoundaries.test.ts`, `check:css-important`, perf-budget and `*Guardrails`
  tests) are fitness functions.
- **YAGNI / KISS / "choose boring technology"** — build for the problem you have,
  not the one you imagine. Every novel dependency or pattern spends an innovation
  token; prefer the well-understood tool unless the novelty is the point.
- **SOLID, separation of concerns, coupling/cohesion, dependency direction** — no
  wrong-way or cross-app dependencies; boundaries that match ownership (Conway).
  Labs enforces `src/shared/**`-only cross-app reuse and no `src/<a>/ → src/<b>/`
  imports.
- **Single source of truth** — one owner per entity; no duplicated state that can
  diverge; a migration/backfill path for any schema change. (`docs/SOURCE_OF_TRUTH.md`.)
- **Risk-driven review (SEI ATAM, lightweight)** — pick the top quality-attribute
  scenarios, map them to the design decisions, and surface risks, sensitivity
  points, and tradeoff points. A design review is a fast ATAM: where does one
  decision trade one -ility for another?
- **C4 model** (Context / Container / Component / Code) — communicate the design at
  the right zoom level when a diagram helps.

## Checklist

- **Requirements fit** — solves the stated problem, and it is the right problem.
- **Decisions + alternatives** — each material decision states its alternatives and the tradeoff; a design with no rejected options is under-thought.
- **Reversibility** — one-way or two-way door, named; scrutiny scaled to it.
- **Interfaces + contracts** — explicit, minimal, stable; no leaky abstraction or unversioned widening.
- **Data model** — single source of truth, ownership, invariants, migration path.
- **Failure modes** — partial failure, retry, timeout, offline, concurrent writes, interruption, **data loss** (the P0 class here — silent overwrite, tombstones, needs-review).
- **-ilities** — top two or three named, with their trade points.
- **Simplicity** — YAGNI/KISS/boring-tech; no speculative generality or premature optimization.
- **Coupling + dependency direction** — SOLID, separation of concerns, no wrong-way/cross-app deps.
- **Fitness function** — the automated guard for each load-bearing invariant; none named is a finding.
- **Testability + rollout** — testable at the right tier (`docs/TEST_STRATEGY.md`); incremental path, flag, rollback, backward compatibility during transition.
- **ADR** — material cross-cutting decision recorded.

## Solo-portfolio calibration

Reach ≈ 1 and one maintainer, so weight **maintenance cost, cognitive load, and the
blast radius of a one-way door** over scalability-for-scale. The cheapest correct
design that a single person can keep alive wins. Over-engineering — a generic
framework for one call site, a distributed pattern for a local problem — is itself a
finding here, not prudence.
