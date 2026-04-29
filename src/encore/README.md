# Encore

Personal musical repertoire companion: **local-first** (Dexie / IndexedDB) with optional **Google Drive** sync for `repertoire_data.json`, plus an optional **public snapshot** for read-only sharing.

## Environment files (Vite)

This repo sets Vite **`root` to `src/`**, so env files are read from **`src/`** (not the repository root).

| File                                          | Committed?                | When loaded                       |
| --------------------------------------------- | ------------------------- | --------------------------------- |
| [`src/.env.development`](../.env.development) | Yes                       | `npm run dev`                     |
| [`src/.env.production`](../.env.production)   | Yes                       | `npm run build` / production mode |
| `src/.env.local` / `src/.env.*.local`         | No (`*.local` gitignored) | Optional overrides                |

Shared defaults (including `VITE_GOOGLE_CLIENT_ID`) live in the committed **development** and **production** files. Use `src/.env.local` only for machine-specific values (e.g. extra hashes) without editing committed files.

## Environment variables

| Variable                         | Purpose                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`          | Google Identity Services OAuth client (Web).                                                                                                                                      |
| `VITE_GOOGLE_OAUTH_REDIRECT_URI` | Optional override for GIS `redirect_uri`. Default is **`{origin}/encore`** (no trailing slash). Set this only if your OAuth client lists a different string (e.g. `.../encore/`). |
| `VITE_ALLOWED_EMAIL_HASHES`      | Comma-separated **SHA-256 hex** digests of **normalized** emails (`trim` + lowercase). No plaintext emails in the repo.                                                           |
| `VITE_SPOTIFY_CLIENT_ID`         | Spotify app (PKCE). Redirect URIs must match the dashboard (see **Spotify console** below).                                                                                       |
| `VITE_GOOGLE_API_KEY`            | Drive API key (HTTP referrer restricted) so **guests** can `alt=media` read `public_snapshot.json` without signing in.                                                            |

### Allowlist workflow

1. Pick the Google account email you will use.
2. Compute SHA-256 of the normalized string (same rules as the app). Example with Node:

   `node -e "const c=require('crypto');console.log(c.createHash('sha256').update('you@example.com','utf8').digest('hex'))"`

3. Put that hex string in `VITE_ALLOWED_EMAIL_HASHES` for local dev or GitHub Actions secrets for deploy.

**Privacy note:** hashes hide emails from casual repo readers; they do not stop someone with resources from guessing common addresses against the published list.

### Google Cloud console

- Enable **Google Drive API**, **People API** (if needed), and **YouTube Data API v3** for playlist import.
- OAuth scopes requested by Encore (add all under **Google Auth Platform → Data access**): `drive.file`, `userinfo.email`, and **`youtube.readonly`** (read playlists you own). After adding `youtube.readonly`, users must **sign in to Google again** once so the new scope is granted.
- **Authorized JavaScript origins** (Web client): add every origin you use (**no path**), e.g. `http://localhost:5173` and `http://127.0.0.1:5173` (match your Vite port). This is the main requirement for the GIS **token (popup)** flow. Missing origins often produce a vague “Something went wrong”.
- **Authorized redirect URIs:** Encore sends **`redirect_uri` = `{origin}/encore`** (no trailing slash), e.g. `http://127.0.0.1:5173/encore`. Google compares this string **byte-for-byte** to your list. A trailing slash on only one side causes **`redirect_uri_mismatch`**, so either register **`.../encore`** (recommended, matches the app default) or add **`.../encore/`** and set **`VITE_GOOGLE_OAUTH_REDIRECT_URI`** to that exact URL. Typical set:
  - `http://localhost:5173/encore`
  - `http://127.0.0.1:5173/encore`
  - `https://labs.tiffzhang.com/encore` (production)
- **Staying signed in:** Encore stores the short-lived Google access token in **`localStorage`** (with expiry) so refresh keeps you in-app until the token ages out (~1 hour). On each load it also tries **`prompt: 'none'`** so if you are still logged into Google in the browser you can get a new token without clicking. **Disconnect Google** in the app header clears that storage and calls Google’s **`revoke`**. Treat Encore like any SPA with a stored OAuth token: XSS on this origin could exfiltrate it until expiry. **Spotify** access and refresh tokens are also stored in **`localStorage`** (PKCE verifier and OAuth `state` stay in **`sessionStorage`** only for the redirect round-trip). Use **Disconnect Spotify** in the header to clear Spotify without leaving your Google account; Spotify is optional metadata beside Drive.

### Spotify console

- Authorization code + PKCE.
- **Redirect URIs:** Spotify [does not allow `localhost`](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) as the redirect host. Use the loopback literal **`127.0.0.1`** (HTTP is OK on loopback). Register the exact URL, for example:
  - `http://127.0.0.1:5173/encore/` — Vite dev (adjust port if yours differs).
  - `https://labs.tiffzhang.com/encore/` — production.
- Open Encore at **`http://127.0.0.1:<port>/encore/`** when testing Spotify so the redirect URI matches the page origin (PKCE verifier and OAuth `state` live in `sessionStorage` for that tab only; tokens persist in `localStorage` like Google). On `localhost`, Encore shows a link to the same URL on `127.0.0.1` instead of forcing a redirect (which would break Google unless that origin is also allowlisted).
- OAuth scopes: Encore requests **`playlist-read-private`** and **`playlist-read-collaborative`** so **Import playlists** can read your Spotify playlists. The same token is used for **Search** and **audio features** in the song editor. After a scope change, use **Connect Spotify** again.
- In the **Spotify Developer Dashboard** for your app, confirm **`playlist-read-private`** and **`playlist-read-collaborative`** are among the scopes your integration may request (Spotify’s UI for this changes over time; if those scopes are not enabled for the app, consent cannot grant them and imports may return **403**).
- **Playlist import `403 Forbidden`:** Encore only sees playlists the **linked Spotify account** may read. **Another user’s private playlist** is blocked until they make it **public** in Spotify, or you **Disconnect Spotify** in Encore and sign in with the **owner** account. **Stale sessions** from before playlist scopes were added behave the same—disconnect Spotify, sign in again, and accept both playlist scopes. Encore stores the granted `scope` on the token so it can detect incomplete consent when possible.

## Library: playlist import

From **Library → Import playlists**, paste **Spotify** and/or **YouTube** playlist URLs or ids in **one box** (one playlist per line, or **comma-separated**). Encore infers each line’s platform from the URL. If both sides have tracks, Encore suggests YouTube links per track using title similarity; adjust the **Link YouTube** dropdown before importing. Songs get optional `spotifyTrackId` / `youtubeVideoId` fields (editable later in the song dialog).

## Drive layout (auto-created)

Under **My Drive**:

- `Encore_App/repertoire_data.json` — canonical merged data.
- `Encore_App/Performances/` — shortcuts to performance videos.
- `Encore_App/SheetMusic/` — reserved for your own organization (IDs stored per song).
- `Encore_App/public_snapshot.json` — created/updated when you use **Share** (link-readable).

## Guest URLs

Format: `https://labs.tiffzhang.com/encore/#/share/<FILE_ID>` where `FILE_ID` is the Drive id of `public_snapshot.json`.
