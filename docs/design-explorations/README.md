# Design explorations

**Purpose:** Hold **non-binding** design notes—options, tradeoffs, and future directions that are useful to revisit but are **not** repo policy until promoted.

**Precedence:** These docs sit **below** enforced config, `DEVELOPMENT.md`, and [`docs/adr/`](../adr/README.md). If an exploration hardens into a decision, capture it in a numbered ADR (or update `DEVELOPMENT.md`) and trim or archive the exploration so one place stays canonical.

**What belongs here**

- Architecture spikes, “if we ever…” write-ups, comparisons of third-party approaches.
- Anything that would clutter ADRs with “maybe later” without a firm decision.

**What does not belong here**

- User-facing copy rules, CI behavior, or anything that must stay in lockstep with automation—use the paths in [`docs/SOURCE_OF_TRUTH.md`](../SOURCE_OF_TRUTH.md).

## Contents (examples)

| Document                                                           | Summary                                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [`local-first-session-and-bff.md`](local-first-session-and-bff.md) | Browser OAuth vs local-first data, token refresh / BFF options, growing backend surface without a second silent source of truth. |

Add new files to this table when you drop another exploration here.
