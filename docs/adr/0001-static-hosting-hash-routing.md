# ADR 0001: Static hosting (GitHub Pages) and hash-based client routing

## Status

Accepted

## Context

- Labs ships multiple Vite micro-apps to **GitHub Pages** (CI uploads `dist/`). Each app is a real directory with `index.html` (e.g. `encore/index.html`), so **cold loads** work for the app root such as `/encore/`.
- GitHub Pages **does not** offer server-configurable rewrites (e.g. “any `/encore/*` → `encore/index.html`”) for SPA-style **path** deep links. A cold request to `/encore/song/<id>/` has no matching static file and returns **404** unless a separate edge or `404.html` hack is introduced.
- Therefore, in-app navigation that must survive **refresh, copy-paste, and new tab** for arbitrary screens historically uses **`location.hash`** (e.g. `#/song/…`): the browser only requests `/encore/`, and the fragment stays client-side.

## Decision

1. **Default** for micro-apps deployed only on static GitHub Pages: use **hash-based client routing** for in-app URLs unless production is changed to add SPA fallbacks (CDN, different host, etc.).
2. **In-page “anchors”** while using hash routing must not rely on a second URL fragment (there is only one `location.hash`). Prefer an **in-fragment query parameter** for scroll intent, e.g. `#/song/<id>?scroll=encore-song-practice-heading`, with:
   - strict parsing so route detection ignores the query portion;
   - sanitized element ids before `getElementById`;
   - normalization (strip `scroll` after handling) so reload does not repeat scroll side effects.
3. **Path-based** client routes remain valid **only** where the deployment guarantees SPA fallback for deep paths (document that host in the app README or a follow-up ADR).

## Consequences

- **Positive:** Deep links and cold loads keep working on Pages without infra changes; OAuth redirect origins stay on app roots like `/encore`.
- **Negative:** URLs are less “pretty” than path-only SPAs; parsers and tests must handle optional `?…` inside the hash; native `#id` scroll behavior does not apply to the route segment—use imperative scroll + focus where a11y matters.
- **Encore** implements globe / deep links using the `?scroll=` convention per product plan; other apps may adopt the same pattern when needed.

## Alternatives considered

- **Path-only routing** — better URLs but requires host rewrites; rejected for Encore-on-Pages until hosting changes.
- **Second `#` inside the fragment** — valid but less readable; rejected in favor of `?scroll=`.
- **`sessionStorage` scroll hints** — no shareable URL; rejected as primary.

## Links

- [`DEVELOPMENT.md`](../../DEVELOPMENT.md) — Monorepo / deployment context
- [`src/encore/README.md`](../../src/encore/README.md) — Encore-specific hosting and OAuth notes
