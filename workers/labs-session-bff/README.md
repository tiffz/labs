# Labs session BFF (Cloudflare Worker)

Minimal Google OAuth session broker for Labs micro-apps. Holds **refresh tokens** server-side and returns short-lived **access tokens** — restoring long-lived Drive sync without GIS silent refresh (ADR 0014).

## One-time setup

### 1. Cloudflare

```bash
cd workers/labs-session-bff
npm install
npx wrangler kv namespace create SESSION_KV
npx wrangler kv namespace create SESSION_KV --preview
```

Copy the returned IDs into `wrangler.toml` (`id` and `preview_id`).

Generate signing keys (32 bytes each, hex):

```bash
openssl rand -hex 32   # SESSION_SIGNING_KEY
openssl rand -hex 32   # REFRESH_ENCRYPTION_KEY
```

Set secrets (production):

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SIGNING_KEY
npx wrangler secret put REFRESH_ENCRYPTION_KEY
```

For local dev, copy `.dev.vars.example` → `.dev.vars` and fill values.

Deploy:

```bash
npm run deploy
```

### 2. Google Cloud Console

On your **Web application** OAuth client:

- **Authorized redirect URIs:** `https://<your-worker>/v1/oauth/google/callback` and `http://127.0.0.1:8787/v1/oauth/google/callback` for local dev.
- **Authorized JavaScript origins:** your Labs Pages origin(s), e.g. `https://labs.tiffzhang.com`, `http://127.0.0.1:5173`.
- Use the **same client ID** as `VITE_GOOGLE_CLIENT_ID`; the **client secret** lives only in the Worker.

### 3. Labs build

Set in GitHub Actions / local `.env`:

```bash
VITE_LABS_SESSION_BFF_URL=https://<your-worker>
```

When unset, apps keep legacy GIS-only sign-in (ADR 0010/0011). When set but the Worker is down, interactive sign-in **falls back to GIS on the same click**; background refresh still requires the user to click sign-in again (no GIS silent refresh).

## Local dev

Terminal A:

```bash
cd workers/labs-session-bff && npm run dev
```

Terminal B (repo root):

```bash
VITE_LABS_SESSION_BFF_URL=http://127.0.0.1:8787 npm run dev
```

## API

| Method | Path                                            | Description                                                                         |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/health`                                       | Liveness                                                                            |
| GET    | `/v1/oauth/google/start?return_origin=&popup=1` | Returns `{ authUrl }`                                                               |
| GET    | `/v1/oauth/google/callback`                     | Google redirect (sets session cookie; popup → worker `/v1/oauth/google/popup-done`) |
| GET    | `/v1/oauth/google/popup-done`                   | Popup bridge: first-party token fetch + `postMessage` to app origin                 |
| GET    | `/v1/session/google/access-token`               | Refresh access token (cookie auth)                                                  |
| POST   | `/v1/session/google/sign-out`                   | Clear session                                                                       |

The worker calls **only** `https://oauth2.googleapis.com/token` — never Drive/YouTube APIs.

## Rollback

Unset `VITE_LABS_SESSION_BFF_URL` and redeploy Pages. No data migration required.

## Manual QA

### Before you start

1. **Google Cloud Console** (Web OAuth client used by `VITE_GOOGLE_CLIENT_ID`):
   - **Authorized redirect URIs:** add `https://labs-session-bff.tiffz.workers.dev/v1/oauth/google/callback` (and `http://127.0.0.1:8787/v1/oauth/google/callback` if testing against `wrangler dev`).
   - **Authorized JavaScript origins:** must include `https://labs.tiffzhang.com` and `http://127.0.0.1:5173` (Encore dev redirects `localhost` → `127.0.0.1`).
2. **Frontend env:** `VITE_LABS_SESSION_BFF_URL=https://labs-session-bff.tiffz.workers.dev` in `src/.env.production` (Pages) and/or `src/.env.local` (local dev). Restart Vite after changes.
3. **Worker:** secrets set and `npm run deploy` succeeded (see deploy URL in Wrangler output).

### Layer 1 — Worker only (terminal)

```bash
curl -s https://labs-session-bff.tiffz.workers.dev/health
# → {"ok":true,"service":"labs-session-bff"}

curl -s "https://labs-session-bff.tiffz.workers.dev/v1/oauth/google/start?return_origin=https://labs.tiffzhang.com&popup=1"
# → JSON with "authUrl" pointing at accounts.google.com
```

### Layer 2 — Local Encore (fastest full path)

1. Copy `src/.env.local.example` → `src/.env.local` if needed; restart `npm run dev`.
2. Open `http://127.0.0.1:5173/encore/` (not `localhost`).
3. Account menu → **Sign in with Google** (or **Sign in again**).
4. DevTools → **Network** → filter `labs-session-bff`:
   - `GET …/v1/oauth/google/start` → 200 with `authUrl`
   - After popup completes: `GET …/v1/session/google/access-token` may appear on refresh
5. Confirm identity in the account menu; try a Google feature (e.g. Drive backup indicator).

### Layer 3 — Production (after merge + Pages deploy)

1. Wait for CI to finish deploying GitHub Pages (build reads `src/.env.production`).
2. Open `https://labs.tiffzhang.com/encore/`.
3. Hard refresh (or private window) so you are not on an old bundle without the BFF URL.
4. Repeat sign-in + Network checks from Layer 2 against `labs-session-bff.tiffz.workers.dev`.
5. **Reload test:** close tab, reopen Encore — token refresh should call `/v1/session/google/access-token` without a GIS silent prompt.
6. **Sign out:** Account menu → disconnect Google → Network should show `POST …/v1/session/google/sign-out`.

### Troubleshooting

| Symptom                                 | Fix                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch` in Google popup | Add Worker callback URI in Console (exact path `/v1/oauth/google/callback`).                    |
| CORS error from `127.0.0.1:5173`        | Confirm origin is in `ALLOWED_ORIGINS` in `wrangler.toml`; redeploy Worker.                     |
| Still GIS-only (no BFF requests)        | BFF URL not in the running build — check `.env.local` + Vite restart, or wait for Pages deploy. |
| Popup blocked                           | Allow popups for `127.0.0.1` / `labs.tiffzhang.com`.                                            |
| “Closed before finishing” after consent | Redeploy Worker (`popup-done` route) + hard-refresh Encore; see ADR 0014 popup bridge.          |
