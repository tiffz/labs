# Encore

Personal musical repertoire companion: **local-first** (Dexie / IndexedDB) with optional **Google Drive** sync for `repertoire_data.json`, plus an optional **public snapshot** for read-only sharing.

**Who it is for:** Encore is **singer-first**. Voice and repertoire are the primary focus; **piano or self-accompaniment** are supported as secondary detail (for example performance history and filters), not as a separate instrument-learning app.

## Repertoire depth (how the pieces fit)

- **Milestones** are the main **structured** progress layer: a shared template on every song, per-row **To do / Done / N/A** (N/A is explicit and reversible), plus **song-only** rows for one-off goals. They answer “what done means” for this title in a scannable way.
- **Practice journal** (Markdown on each song) stays **first-class** for long-form nuance: arrangement notes, staging, or why a milestone does not apply. Use milestones for the checklist and the journal for everything that does not fit a checkbox.
- **Practicing** is a single boolean (“on my desk” / rotation). It does **not** auto-sync with milestone completion.
- **Performances** store **accompaniment** (vocal-only vs self-accompanied keys, etc.) for each logged show. That is gig history and filtering, separate from milestone rows.

## What sign-in enables (plain language)

- **Without Google:** Your library stays in this browser and works offline.
- **With Google:** Encore can keep a backup copy of your data in **your** Google Drive (`drive.file`), list file names in folders you point at (`drive.metadata.readonly`, for bulk performance import from a pasted folder and subfolders), and read **your** YouTube playlists when you paste links for import (`youtube.readonly`). Encore does not post to YouTube. File **contents** still use `drive.file` (your Encore data file, picker selections, uploads); metadata listing does not download video or audio bytes.
- **Spotify:** Optional. Connect it from the **Account** menu for playlist import and track lookup. See **Spotify console** below for redirect and scope notes.

For UI copy conventions, see [`COPY_STYLE.md`](COPY_STYLE.md).

## Development: one browser origin for Encore

Browsers store IndexedDB and `localStorage` **per origin** (scheme + host + port). `http://localhost:5173` and `http://127.0.0.1:5173` are different origins, so you would otherwise see **two separate libraries** in dev.

In **`import.meta.env.DEV` only**, opening Encore on **`localhost`** immediately **redirects** to the same path on **`127.0.0.1`** so Spotify OAuth and your local library stay on one loopback host. **Production** uses your deployed host only (e.g. `https://labs.tiffzhang.com`), which is always a single origin per user.

## Environment files (Vite)

This repo sets Vite **`root` to `src/`**, so env files are read from **`src/`** (not the repository root).

| File                                          | Committed?                | When loaded                       |
| --------------------------------------------- | ------------------------- | --------------------------------- |
| [`src/.env.development`](../.env.development) | Yes                       | `npm run dev`                     |
| [`src/.env.production`](../.env.production)   | Yes                       | `npm run build` / production mode |
| `src/.env.local` / `src/.env.*.local`         | No (`*.local` gitignored) | Optional overrides                |

Shared defaults (including `VITE_GOOGLE_CLIENT_ID`) live in the committed **development** and **production** files. Use `src/.env.local` only for machine-specific values (e.g. extra hashes) without editing committed files.

## Environment variables

| Variable                         | Purpose                                                                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`          | Google Identity Services OAuth client (Web).                                                                                                                                                                                       |
| `VITE_GOOGLE_OAUTH_REDIRECT_URI` | Optional override for GIS `redirect_uri`. Default is **`{origin}/encore`** (no trailing slash). Set this only if your OAuth client lists a different string (e.g. `.../encore/`).                                                  |
| `VITE_ALLOWED_EMAIL_HASHES`      | Comma-separated **SHA-256 hex** digests of **normalized** emails (`trim` + lowercase). No plaintext emails in the repo.                                                                                                            |
| `VITE_SPOTIFY_CLIENT_ID`         | Spotify app (PKCE). Redirect URIs must match the dashboard (see **Spotify console** below).                                                                                                                                        |
| `VITE_GOOGLE_API_KEY`            | Browser **API key** (`AIza…`, **not** the OAuth client id). HTTP-referrer restricted; used for **guest** `alt=media` reads of `public_snapshot.json` and for **Google Picker** (`setDeveloperKey`). See **Browser API key** below. |

**GitHub Pages (CI):** Production builds use the **`VITE_GOOGLE_API_KEY` repository secret** (or the same name on the **`github-pages` environment**). GitHub Actions injects it at build time for `.github/workflows/ci.yml` and `deploy-docs.yml`; it is not read from committed `src/.env.production`. Local dev still uses `src/.env.local` or uncommented vars in `src/.env.development`.

### Allowlist workflow

1. Pick the Google account email you will use.
2. Compute SHA-256 of the normalized string (same rules as the app). Example with Node:

   `node -e "const c=require('crypto');console.log(c.createHash('sha256').update('you@example.com','utf8').digest('hex'))"`

3. Put that hex string in `VITE_ALLOWED_EMAIL_HASHES` for local dev or GitHub Actions secrets for deploy.

**Privacy note:** hashes hide emails from casual repo readers; they do not stop someone with resources from guessing common addresses against the published list.

### Google Cloud console

- Enable **Google Drive API**, **People API** (if needed), and **YouTube Data API v3** for playlist import.
- OAuth scopes requested by Encore (add all under **Google Auth Platform → Data access**): `drive.file`, **`drive.metadata.readonly`** (list names in pasted Drive folders and subfolders for bulk performance import), `userinfo.email`, **`userinfo.profile`** (given name for the greeting), and **`youtube.readonly`** (read playlists you own). After adding or changing scopes, users must **sign in to Google again** once so the new scope is granted. **Google Picker** still uses your browser API key plus OAuth; per-file access for uploads stays on `drive.file`. Encore does **not** request full `drive.readonly` (content-wide read).
- **Authorized JavaScript origins** (Web client): add every origin you use (**no path**), e.g. `http://localhost:5173` and `http://127.0.0.1:5173` (match your Vite port). This is the main requirement for the GIS **token (popup)** flow. Missing origins often produce a vague “Something went wrong”.
- **Authorized redirect URIs:** Encore sends **`redirect_uri` = `{origin}/encore`** (no trailing slash), e.g. `http://127.0.0.1:5173/encore`. Google compares this string **byte-for-byte** to your list. A trailing slash on only one side causes **`redirect_uri_mismatch`**, so either register **`.../encore`** (recommended, matches the app default) or add **`.../encore/`** and set **`VITE_GOOGLE_OAUTH_REDIRECT_URI`** to that exact URL. Typical set:
  - `http://localhost:5173/encore`
  - `http://127.0.0.1:5173/encore`
  - `https://labs.tiffzhang.com/encore` (production)
- **Google Picker (manual QA):** From a song, use **Charts folder** / **My Drive** under “Browse in Google Drive”, or **Google Picker** in the Drive file dialog, or **Browse My Drive** in the performance editor. If the overlay appears blank or errors after idle, **Sign in with Google** again so the access token is fresh.

#### Browser API key (`VITE_GOOGLE_API_KEY`) — Picker + guest reads

Create this in **Google Cloud Console → APIs & Services → Credentials → Create credentials → API key**. It is **not** the same string as `VITE_GOOGLE_CLIENT_ID` (that value ends in `.apps.googleusercontent.com` and is only for OAuth).

1. **Application restrictions:** choose **HTTP referrers (web sites)** and list **every origin** where Encore runs, **with a path wildcard**. Dev defaults to **`127.0.0.1`** (see **Development: one browser origin**); the referrer Google sends uses that host, not `localhost`, after the in-app redirect. Typical entries (adjust the port to match Vite, often `5173`):
   - `http://127.0.0.1:5173/*`
   - `http://localhost:5173/*` (optional backup if you ever load without redirect)
   - Production: `https://labs.tiffzhang.com/*` (or your host)
     Missing **`127.0.0.1`** in the key’s referrer list is the usual cause of Google’s **“There was an error! The API developer key is invalid.”** in local development.
2. **API restrictions:** restrict the key and allow at least **Google Drive API**. If the console lists **Google Picker API** for this project, enable it as well.
3. Put the key in **`src/.env.local`** as `VITE_GOOGLE_API_KEY=…`, then **restart** `npm run dev` so Vite picks it up. **Do not** put this key in committed `src/.env.development`; that file is shared in git, while `.env.local` stays on your machine only.

**Local dev + guest snapshot reads:** Browsers load `public_snapshot.json` via the Drive API using this key. Referrer-restricted keys often make **direct** `googleapis.com` requests fail CORS on `http://127.0.0.1:…` even when the key is valid. With `npm run dev`, Encore uses a **same-origin Vite proxy** for those reads so publish checks and the guest view work without relaxing key restrictions. The proxy sends `Referer: http://<your-dev-host>/encore/` by default (from the incoming request’s `Host`). If your key’s allowlist only includes **production** (e.g. `https://labs.example.com/*` but **not** loopback), set **`VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER`** in `.env.local` to that production origin with path, for example `https://labs.example.com/encore/`, so outbound Drive requests match an allowed referrer. Production builds still call Google directly from the browser.

- **Staying signed in:** Encore stores the short-lived Google access token in **`localStorage`** (with expiry). On load, if that token is **still within its saved expiry window**, Encore verifies it in the background and keeps you signed in. There is **no automatic `prompt: 'none'`** on first paint (that flow often tripped pop-up blockers and could hang the app if Google’s callback never ran). After the saved token expires, use **Sign in with Google** again. **Disconnect Google** is in the **Account** menu (top right) and clears that storage plus calls Google’s **`revoke`**. Treat Encore like any SPA with a stored OAuth token: XSS on this origin could exfiltrate it until expiry. **Spotify** access and refresh tokens are also stored in **`localStorage`** (PKCE verifier and OAuth `state` stay in **`sessionStorage`** only for the redirect round-trip). **Connect / Disconnect Spotify** live in the same Account menu; Spotify is optional for playlist import and song metadata.

### Spotify console

- Authorization code + PKCE.
- **Redirect URIs:** Spotify [does not allow `localhost`](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) as the redirect host. Use the loopback literal **`127.0.0.1`** (HTTP is OK on loopback). Register the exact URL, for example:
  - `http://127.0.0.1:5173/encore/` — Vite dev (adjust port if yours differs).
  - `https://labs.tiffzhang.com/encore/` — production.
- **Dev server:** `npm run dev` binds **127.0.0.1** by default (see root `vite.config.ts`), so the URL you open matches Spotify’s loopback redirect requirement without switching hosts.
- If you still open Encore on **`localhost`** in dev, the app **redirects** to **127.0.0.1** with the same path and hash so PKCE / session line up and you keep one local library (see **Development: one browser origin** above). If you bypass that, use the in-app link to **127.0.0.1** from playlist import or the account menu instead of forcing a full redirect yourself (which can break Google unless both origins are allowlisted).
- OAuth scopes: Encore requests **`playlist-read-private`** and **`playlist-read-collaborative`** so **Import playlists** can read your Spotify playlists. The same token is used for **Search** on the song page. After a scope change, use **Connect Spotify** again.
- In the **Spotify Developer Dashboard** for your app, confirm **`playlist-read-private`** and **`playlist-read-collaborative`** are among the scopes your integration may request (Spotify’s UI for this changes over time; if those scopes are not enabled for the app, consent cannot grant them and imports may return **403**).
- **Playlist import `403 Forbidden`:** Encore only reads playlists as the **Spotify user you linked** (Account menu → Connect Spotify), which may differ from your Google login. Import errors now include that Spotify user id and, when the API allows it, the playlist **owner** id so you can spot an account mismatch. **Another user’s private playlist** stays blocked until it is **public** in Spotify or you link the **owner** Spotify account. **Stale OAuth** (missing `playlist-read-private` / `playlist-read-collaborative` on the stored token) is fixed by Disconnect Spotify → Connect again. **Spotify Developer Dashboard:** in **Development** mode, add every Spotify login you use under **User management** for your app; otherwise the Web API can return 403 even for “your” playlists until the app is in Extended Quota or the user is allowlisted. Encore loads tracks via **`GET /v1/playlists/{id}/items`** (with `market` from your profile when available), not the legacy **`/tracks`** path.

## Library: playlist import

From **Library → Import playlists**, paste **Spotify** and/or **YouTube** playlist URLs or ids in **one box** (one playlist per line, or **comma-separated**). Encore infers each line’s platform from the URL. If both sides have tracks, Encore suggests YouTube links per track using title similarity; adjust the **Link YouTube** dropdown before importing. Songs get optional `spotifyTrackId` / `youtubeVideoId` fields (editable on the song page).

## Drive layout (auto-created)

Under **My Drive**:

- `Encore_App/repertoire_data.json` — canonical merged data.
- `Encore_App/Performances/` — shortcuts to performance videos.
- `Encore_App/SheetMusic/` — reserved for your own organization (IDs stored per song).
- `Encore_App/public_snapshot.json` — created/updated when you use **Share** (link-readable).

## Guest URLs

Format: `https://labs.tiffzhang.com/encore/#/share/<FILE_ID>` where `FILE_ID` is the Drive id of `public_snapshot.json`.
