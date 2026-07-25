# ADR 0026: Tiered debug access (safe-in-prod diagnostics vs owner-only internals)

## Status

Accepted (2026-07-25)

## Context

Labs debug mode is enabled by `?debug` / `?dev` via the shared reader
(`readLabsDebugFromLocation()`), which is **pure runtime** — no `import.meta.env`
gate. `AGENTS.md` said "debug mode is local-dev only — do not expose debug endpoints
in production builds", but that was enforced only for the *plumbing* (the dev-server
`/__debug_*` endpoints, ServerLogger forwarding, cats snapshot POST — all
`import.meta.env.DEV`-gated). The **visible debug panels were runtime-only**, so in a
production build `?debug` exposed the full debug dock in drums, melodia, scales, sight,
zinebox, muscle, and cats — including destructive controls (sight "Clear ALL Labs
localStorage", zinebox "Clear library") and economy god-mode — to any anonymous
visitor. Meanwhile the apps the owner most wants to debug in prod (Encore) mounted no
debug surface at all.

The owner needs debug usable **in production for their own testing**, without exposing
destructive tooling to the public.

## Decision

Introduce a **tiered** debug gate — `labsDebugAccess()` →
`'off' | 'diagnostics' | 'full'` (`src/shared/debug/labsDebugAccess.ts`):

- **`off`** — no `?debug`/`?dev`.
- **`diagnostics`** — `?debug` in prod, anonymous. **Read-only** telemetry only (voice/
  heap counters, build/version, route state). No mutations, destructive actions, god-
  mode, or data dumps.
- **`full`** — localhost (`import.meta.env.DEV`) always, **or** `?debug` in prod while
  the owner is signed in. Everything, including destructive/god-mode/data-dump surfaces.

"Owner signed in" reuses the persisted-Google-identity check ([the Private-tier gate,
ADR-adjacent](../TECH_DEBT_ROADMAP.md)): the private apps use a restricted OAuth client,
so a persisted identity means the allowlisted owner. The check reads the localStorage
key directly to avoid a `shared/debug -> shared/google` module edge.

Gate every mutating / destructive / data-dumping control on `isLabsDebugFull()`; render
read-only readouts whenever `isLabsDebugVisible()`.

## Consequences

- **Prod is safe by default**: an anonymous `?debug` visitor can never reach a
  destructive action or god-mode, only read-only diagnostics.
- **The owner gets full debug in prod** by being signed in — no build flag needed.
- Guardrail: `labsDebugAccess.test.ts` pins the invariant (anon prod = diagnostics, never
  full). The tiered model is the single home for future hardening.
- Migration is incremental: each app's debug entry point swaps its `?debug` read for
  `isLabsDebugFull()` (tooling) or `isLabsDebugVisible()` (read-only). This ADR lands the
  gate + the two most-exposed surfaces (sight, zinebox); the rest follow, plus a unified
  `LabsDebugProvider`/dock mounted in every shell (Encore included) and shared debug
  primitives (state dump, danger zone, button styles) to remove the per-app duplication.

## Alternatives considered

- **Block all debug in prod (localhost-only, as documented).** Rejected: the owner
  can't test in prod, which is the presenting need.
- **All-or-nothing owner gate (no anonymous diagnostics tier).** Viable, but a read-only
  diagnostics tier is harmless and lets a diagnostics link work without sign-in; owner
  chose to keep it.
- **Import `shared/google` for the owner check.** Rejected: adds a module-cycle edge;
  the direct localStorage read is equivalent and decoupled.
