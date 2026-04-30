# Encore copy style

**First:** follow [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) for Labs default voice (short, user-focused, warm, plain language, no em dashes in UI).

Encore-specific notes:

- **Landings and gates** (`AccessGateScreens.tsx`, shell chrome): one headline, one short supporting block, then the primary action. Put permission lists, scope tables, and env setup in [`README.md`](README.md), not stacked above the CTA.
- **Dev vs prod data:** local library data is per **browser origin**. In dev, Encore redirects `localhost` → `127.0.0.1` so loopback matches Spotify and you do not split IndexedDB across two hosts; production stays on your real site origin only.
- **Account and sync messages**: stay factual and calm; prefer “what you can do next” over abstract reassurance.
