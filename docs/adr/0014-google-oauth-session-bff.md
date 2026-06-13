# ADR 0014: Google OAuth session BFF on Cloudflare Workers

## Status

Accepted.

## Context

[ADR 0010](./0010-encore-no-background-google-refresh.md) and [ADR 0011](./0011-labs-stanza-scales-no-background-google-refresh.md) eliminated **Google Identity Services (GIS) silent refresh** because hidden GIS iframes leaked ghost popups across long Encore / Stanza / Scales sessions. The trade-off: users re-sign in roughly hourly when access tokens expire.

GIS `initTokenClient` returns **short-lived access tokens only** — no refresh token. Background GIS is permanently off-limits per ADR 0010/0011.

[ADR 0007 revision](./0007-revision-stanza-encore-federated-sync.md) and [`local-first-session-and-bff.md`](../design-explorations/local-first-session-and-bff.md) identified the standard fix: a **narrow Backend-for-Frontend (BFF)** that holds Google **refresh tokens** server-side and returns fresh access tokens on demand — without reintroducing GIS `prompt: 'none'`.

**Constraints for v1:**

- Google only (Spotify PKCE refresh stays client-side).
- Cloudflare Workers + KV (free tier; no GCP/AWS).
- Repertoire source of truth unchanged (Drive + Dexie local-first).
- Feature-flagged: `VITE_LABS_SESSION_BFF_URL` unset → legacy ADR 0010/0011 GIS-only behavior.

## Decision

Add **`workers/labs-session-bff`**, a minimal Cloudflare Worker with Workers KV:

| Route                                 | Purpose                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `GET /health`                         | Liveness                                                                    |
| `GET /v1/oauth/google/start`          | PKCE + state; returns Google auth URL (popup sign-in)                       |
| `GET /v1/oauth/google/callback`       | Code exchange; stores encrypted refresh token; sets HttpOnly session cookie |
| `GET /v1/session/google/access-token` | Refresh grant via `oauth2.googleapis.com/token` only                        |
| `POST /v1/session/google/sign-out`    | Clears cookie + KV session                                                  |

**Client:** [`src/shared/session/labsGoogleSessionPort.ts`](../../src/shared/session/labsGoogleSessionPort.ts) abstracts BFF vs legacy GIS. When the BFF URL is set:

- Interactive sign-in opens the BFF OAuth popup (user click only — same as ADR 0010).
- Background refresh calls the BFF (HTTPS fetch, **no GIS**).
- Access tokens still land in `localStorage` via `writePersistedGoogleSession` for cross-tab Drive calls; refresh material **never** stored client-side.

**Preserved from ADR 0010/0011:**

- Never GIS `prompt: 'none'`.
- Never scheduled / focus-driven GIS probes.
- GIS `requestGoogleAccessToken` remains the fallback when `VITE_LABS_SESSION_BFF_URL` is unset **or when the Worker is unreachable at interactive sign-in time** (same click retries via GIS; background refresh still surfaces “Sign in again” per ADR 0010).

**Billing / abuse guardrails (required in worker code):**

- Worker calls **only** `https://oauth2.googleapis.com/token` — never Drive/YouTube APIs.
- No cron triggers; refresh only on client request.
- Per-session rate limits (1 / 30s, 20 / hour) + IP cap.
- Single-flight refresh on the client.

## Consequences

- **Positive:** Long-lived Drive sync without hourly re-sign-in or ghost popups; Stanza/Scales auto-pull benefits via shared `ensureLabsGoogleAccessTokenForDrive`.
- **Negative:** New deploy surface (Wrangler + Cloudflare account); Google Cloud Console redirect URIs for the Worker callback; optional dependency on Worker uptime (interactive sign-in falls back to GIS when the Worker is down; unset `VITE_LABS_SESSION_BFF_URL` disables BFF entirely).
- **Ops:** One-time Console setup documented in [`workers/labs-session-bff/README.md`](../../workers/labs-session-bff/README.md). Rollback = unset `VITE_LABS_SESSION_BFF_URL`.

## Alternatives considered

- **Restore GIS silent refresh with stricter iframe lifecycle** — rejected in ADR 0010/0011; ghost popup risk remains on browsers we don't control.
- **Server-side Drive proxy** — rejected; adds Google API quota surface and maintenance; out of scope for session-only BFF.
- **Firebase Auth / hosted auth product** — same layer, more vendor coupling; rejected for v1.

## Links

- [ADR 0010](./0010-encore-no-background-google-refresh.md) / [ADR 0011](./0011-labs-stanza-scales-no-background-google-refresh.md)
- [`local-first-session-and-bff.md`](../design-explorations/local-first-session-and-bff.md)
- [`workers/labs-session-bff/`](../../workers/labs-session-bff/)
- [`src/shared/session/labsGoogleSessionPort.ts`](../../src/shared/session/labsGoogleSessionPort.ts)
