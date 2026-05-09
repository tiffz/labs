# Architecture Decision Records (ADRs)

Lightweight records of **significant** engineering choices across Labs: context, decision, and consequences. They complement [`DEVELOPMENT.md`](../../DEVELOPMENT.md) (operational policy and guardrails) and app-level docs under `src/<app>/`.

## When to add an ADR

Add a new ADR when a change is **hard to reverse**, **crosses apps or hosting**, or **will confuse future readers** without rationale—for example:

- Client routing model (hash vs path) and static hosting constraints
- OAuth, storage, or sync contracts
- New micro-app boundaries or import-layer rules (often already guarded by tests—ADR explains _why_)
- Security-relevant defaults

Skip an ADR for routine features, one-off UI tweaks, or purely internal refactors unless they encode a new pattern others must follow.

## Format and numbering

- One file per decision: `docs/adr/NNNN-short-kebab-title.md` with **four-digit** sequence (0001, 0002, …). Next free number wins; do not renumber accepted ADRs.
- Use the sections **Status**, **Context**, **Decision**, **Consequences** (and optional **Alternatives**, **Links**).
- Status is usually **Accepted** once merged; use **Proposed** only while under review.

## Agents and humans

- Prefer adding or updating an ADR **in the same PR** as the behavioral change.
- If you only touch policy text in `DEVELOPMENT.md`, consider whether a short ADR improves traceability; large `DEVELOPMENT.md` sections can point here.
- [`AGENTS.md`](../../AGENTS.md) references this folder so coding agents keep ADRs in sync with code.

## Index

| ADR                                                   | Title                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| [0001](./0001-static-hosting-hash-routing.md)         | Static hosting (GitHub Pages) and hash-based client routing |
| [0002](./0002-historical-decisions-in-development.md) | Backfill: prior decisions in `DEVELOPMENT.md`               |
