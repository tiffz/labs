# ADR 0002: Historical decisions recorded in `DEVELOPMENT.md`

## Status

Accepted

## Context

[`DEVELOPMENT.md`](../../DEVELOPMENT.md) has long used inline **Decision / Rationale / Implementation** sections for repo-wide architecture and policy. That content remains authoritative for day-to-day work. Formal files under `docs/adr/` were introduced later ([ADR 0001](./0001-static-hosting-hash-routing.md)).

## Decision

1. **No big-bang rewrite:** We do not bulk-move every past `DEVELOPMENT.md` section into ADRs in one pass.
2. **Opportunistic backfill:** When a maintainer **changes** a topic already documented in `DEVELOPMENT.md`, they may extract or summarize the decision into a new ADR in the same PR and add a short cross-link from `DEVELOPMENT.md` to the ADR (or vice versa).
3. **New cross-cutting choices** (routing, hosting, contracts) get an ADR at decision time per [`docs/adr/README.md`](./README.md).

## Consequences

- Historical rationale stays in `DEVELOPMENT.md` until someone touches that area; ADR index grows gradually with less churn.
- Readers may need both files; [`docs/SOURCE_OF_TRUTH.md`](../SOURCE_OF_TRUTH.md) describes precedence between policy docs and ADRs.

## Links

- [`DEVELOPMENT.md`](../../DEVELOPMENT.md)
- [`docs/adr/README.md`](./README.md)
