# Labs session BFF — agent context

Nested **`AGENTS.md`** for the Cloudflare Worker at `workers/labs-session-bff/`. Root policy: [`../../AGENTS.md`](../../AGENTS.md). This sub-package has its own `package.json` — root `npm run typecheck:session-bff` / `test:session-bff` proxy into it.

## Start here

1. [`README.md`](README.md) — setup, API routes, manual QA, troubleshooting.
2. `wrangler.toml` — bindings, secrets, the commented custom-domain `routes` block.
3. ADR 0014 (`docs/adr/`) — why a server-side session broker instead of GIS silent refresh.

## Pitfalls

- **Never return `GOOGLE_API_KEY` or the OAuth client secret to browsers** — guest snapshot routes call Drive server-side with the key; the client secret lives only in Worker secrets.
- **Cross-site cookie**: the session cookie is set by the Worker's own origin, which is cross-site to `labs.tiffzhang.com` until the custom-domain migration lands (see README § First-party host). Third-party-cookie-blocking browsers drop it — this is a known, tracked limitation, not a bug to "fix" locally.
- **Callback embeds the token** in the redirect HTML specifically to avoid a redundant post-consent `/access-token` fetch that was hitting IP rate limits — do not reintroduce that extra round trip.

## Tests

- `npm run typecheck:session-bff` / `npm run test:session-bff` (root scripts, proxy into this package)
