# Stanza — optional Analyze (tempo / sections)

UX contract for optional upload analysis (tempo, section suggestions). Product surface: Stanza only (Find the Beat was subsumed — ADR 0013).

## Scope

- Analysis runs on **uploaded audio** in Stanza; not a standalone app.
- Shared algorithms live in **`src/shared/beat/**`** — see [`src/shared/beat/TEST_MATRIX.md`](../shared/beat/TEST_MATRIX.md).
- Beat library import/migration: [`import/BEAT_MIGRATION.md`](import/BEAT_MIGRATION.md).

## Agent pointers

- Tempo/octave regressions: update TEST_MATRIX + run `ioiTempoHint.test.ts`.
- Scope rule: [`.cursor/rules/beat-analysis-scope.mdc`](../../.cursor/rules/beat-analysis-scope.mdc).
- Do not reintroduce `src/beat/` app routes.

## Related

- [`README.md`](README.md) — product overview
- [`LAYOUT.md`](LAYOUT.md) — viewer shell (separate from Analyze)
