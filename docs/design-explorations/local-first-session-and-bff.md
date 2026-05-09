# Local-first data vs browser OAuth (session / BFF options)

**Status:** Design reference — not an implemented ADR. Revisit when improving Google sign-in UX (ghost modals, short-lived access tokens) or when adding a small backend.

## Why this doc exists

Labs apps (especially Encore) keep **working data local** (IndexedDB / Dexie) and use **Google** (Drive, Picker, YouTube, Docs) over **OAuth in the browser** (Google Identity Services). Pain around **popups**, **silent refresh**, and **token lifetime** is mostly a **public-client OAuth** problem, not a failure of “local-first” storage.

Relevant client code today:

- [`src/shared/google/googleTokenClient.ts`](../../src/shared/google/googleTokenClient.ts) — serializes `requestAccessToken` to reduce overlapping GIS calls.
- [`src/shared/google/labsGoogleDriveAccess.ts`](../../src/shared/google/labsGoogleDriveAccess.ts) — Drive-oriented token acquisition.
- Encore env and browser API key notes: [`src/encore/README.md`](../../src/encore/README.md) (Browser API key, guest reads).

## Is a backend for token refresh “hackish”?

**No.** OAuth distinguishes **public clients** (browser) from **confidential clients** (server / edge). **Refresh material** is a high-value secret; short-lived **access tokens** in the SPA are normal. A tiny **Backend-for-Frontend (BFF)** or edge Worker that holds refresh tokens and returns fresh access tokens is **standard**, not a contradiction with local-first.

**Local-first** here means: **user-owned working copy and canonical repertoire story stay on-device / user-controlled cloud (e.g. Drive)** until you explicitly choose otherwise. A session broker moves **where the refresh secret lives**, not where **repertoire JSON** lives.

Hosted auth products (Firebase Auth, Clerk, etc.) are largely **the same layer** packaged for you.

## Options (light to heavy)

### A — Client-only improvements (default first step)

- One **session coordinator**: when interactive GIS is allowed (user gesture vs soft failure).
- **Single proactive refresh path** before expiry; avoid many hooks each triggering refresh.
- Clear **Reconnect** affordances; treat expiry as expected, not only as errors.

**Cost:** No new infra. **Lock-in:** None.

### B — Minimal BFF / Worker (optional, if A is not enough)

- Small HTTPS surface (e.g. Cloudflare Worker on free tier): e.g. `POST /v1/session/google/refresh` → `{ access_token, expires_at }`.
- **Version** routes (`/v1/`) from day one if you add more integration endpoints later.
- Keep the contract **narrow** so the implementation can move hosts.

**Still:** Google as IdP; Drive can remain **source of truth** for repertoire.

### C — Full sync / second product database (defer unless needed)

- PowerSync, ElectricSQL, Firestore-as-master, etc. address **multi-device sync and CRDTs**, not GIS modals.
- Introducing a **second source of truth** for core repertoire needs an explicit **ADR** (entity ownership, conflicts, offline, migration). Prefer **projections** (search, analytics, caches) that can be rebuilt from Drive + local before promoting anything to “master.”

## Growing a backend without wrong coupling

If Tier B grows into “more API integrations” or eventual **bounded** cloud-owned data:

1. **Identity & session plane** — OAuth refresh, server secrets, rate limits. Stays state-minimal where possible.
2. **Integration plane** — One bounded module per vendor (Spotify, YouTube, …); no cross-import spaghetti into Drive layout.
3. **Data / SoT plane** — What is canonical **per entity**. Default: **Drive + Dexie** for Encore repertoire until an ADR says otherwise.

**Second SoT:** Prefer **derived / rebuildable** stores first. If something must be authoritative in the cloud, document **which entities**, conflict rules, and offline behavior ([`docs/adr/README.md`](../adr/README.md) when the decision is real).

**When to add Postgres (or similar):** When you need **durable server-owned rows** (billing, webhooks, job queues, multi-tenant admin), not “because we deployed a Worker.”

## Client architecture (flexibility)

- Keep UI and features depending on **narrow ports** (`SessionPort`, `DriveReadPort`, …) with implementations that may call Google directly today and `fetch('/v1/...')` tomorrow.
- Aligns with existing **shared** boundaries and import rules (`AGENTS.md`, `importBoundaries`).

## Related reading

- [Local First Software](https://lofi.so/) — ecosystem and patterns (sync tools, CRDTs); not a substitute for OAuth/BFF decisions.
- [`docs/SOURCE_OF_TRUTH.md`](../SOURCE_OF_TRUTH.md) — where ADRs and `DEVELOPMENT.md` fit in precedence.
- [Design explorations README](README.md) — how this folder relates to ADRs.

When a BFF ships, consider a short **ADR** under `docs/adr/` for scope and non-goals (e.g. “repertoire SoT remains Drive until explicitly changed”).
