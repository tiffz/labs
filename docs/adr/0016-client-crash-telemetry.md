# ADR 0016: Client crash telemetry

**Status:** Proposed (Phase 1 ships local-only; production telemetry deferred)

## Context

Labs micro-apps run client-side with Dexie/localStorage. Render throws and uncaught errors currently:

- Surface in dev via `ServerLogger` (Vite terminal only)
- Are caught by `LabsErrorBoundary` with reload UX (Phase 1)
- Are logged locally in IndexedDB via `labsCrashLog.ts` (Phase 1, capped at 50 entries)

Production has **no crash visibility**. Users may hit white-screen or silent failures that are hard to reproduce. We want telemetry eventually but must stay on **free-tier** cloud services and respect privacy.

## Decision (Phase 1 — Accepted)

Ship **local-first** crash capture:

1. `LabsErrorBoundary` on every app `main.tsx`
2. `installLabsCrashHandlers` for `window.error` + `unhandledrejection`
3. IndexedDB ring buffer exportable via debug tooling
4. E2e `pageerror` guard in `app-shells.spec.ts`

**No third-party production telemetry in Phase 1.**

## Alternatives (Phase 2 — evaluate later)

| Option                        | Pros                   | Cons                                     |
| ----------------------------- | ---------------------- | ---------------------------------------- |
| **IndexedDB only**            | Zero cost, privacy     | No aggregate metrics; user must export   |
| **Cloudflare Workers beacon** | Free tier, self-hosted | Requires worker + D1/KV design           |
| **Sentry free tier**          | Mature grouping        | Event limits; PII review; vendor lock-in |

## Phase 2 requirements (when revisiting)

- **Opt-in** or anonymous-only; no PII in payloads
- Hash routes only (strip query tokens)
- Sample rate on high-traffic apps
- Free-tier budget alarm
- ADR update before enabling in production build

## Consequences

- Agents must not ask users to "check manually" for crashes without checking crash log export
- E2e catches boot-time uncaught errors
- Production crash rates remain unknown until Phase 2

## Links

- [`docs/SHARED_UX_PATTERNS.md`](../SHARED_UX_PATTERNS.md) — Error recovery pattern
- [`src/shared/utils/labsCrashLog.ts`](../../src/shared/utils/labsCrashLog.ts)
- [`src/shared/components/LabsErrorBoundary.tsx`](../../src/shared/components/LabsErrorBoundary.tsx)
