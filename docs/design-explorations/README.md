# Design explorations

**Non-binding** spikes and options. **Not policy** until promoted to an ADR or `DEVELOPMENT.md`.

**Precedence:** Below enforced config, `DEVELOPMENT.md`, and [`docs/adr/`](../adr/README.md). When a decision ships, **promote** and **trim or delete** the exploration so agents are not pulled two ways. See [`DOCUMENTATION_STRATEGY.md`](../DOCUMENTATION_STRATEGY.md) § Lifecycle.

| Document                                                                   | Status                                                               | Summary                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| [`local-first-session-and-bff.md`](local-first-session-and-bff.md)         | **Superseded** → [ADR 0014](../adr/0014-google-oauth-session-bff.md) | Historical OAuth/BFF options (stub only)      |
| [`stanza-encore-overlay-migration.md`](stanza-encore-overlay-migration.md) | Active deferred checklist                                            | Federated Stanza↔Encore dual-read (not wired) |
| [`performance-detail-page.md`](performance-detail-page.md)                 | Exploration                                                          | Encore performance detail route (not shipped) |

Closed no-go spikes (e.g. 3D mannequin) are deleted — use [`.cursor/rules/feasibility-first.mdc`](../../.cursor/rules/feasibility-first.mdc) and git history.
