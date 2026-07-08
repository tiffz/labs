# Encore

Personal musical repertoire companion: **local-first** (Dexie / IndexedDB) with optional **Google Drive** sync for `repertoire_data.json`, plus an optional **public snapshot** for read-only sharing. **Sync architecture (Encore, Stanza, Scales):** [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md).

**Agents:** start with [`AGENTS.md`](AGENTS.md) (nested context for this app).

**Who it is for:** Encore is **singer-first**. Voice and repertoire are the primary focus; **piano or self-accompaniment** are supported as secondary detail (for example performance history and filters), not as a separate instrument-learning app.

## Originals (songwriting)

**Originals** is a separate tab and data domain for **your own songs**: brainstorm markdown, ChordPro charts, demo takes, and local chart history snapshots. Data lives in IndexedDB (`originals` table) and syncs to **`Encore_App/Originals/`** on Google Drive (sharded manifest + per-song JSON; audio bytes under `Originals/audio/`). It does not mix into repertoire `EncoreSong` rows in v1. See [`docs/adr/0012-encore-originals-local-first-domain.md`](../../docs/adr/0012-encore-originals-local-first-domain.md). Chord paint editor (Chords stage): [`originals/DEVELOPMENT.md`](originals/DEVELOPMENT.md).

### Originals song view spacing

- **Scroll:** View mode and write stages (except Add chords integrated scroll) use the Encore shell `#main.in-scroll-region` — avoid nested scroll containers on the song page.
- **M3 tokens:** Section gaps → `encorePageSectionGap`; card/surface padding → `encoreSurfaceContentPad` / `encoreSurfacePadX` ([`theme/encoreM3Layout.ts`](theme/encoreM3Layout.ts)).
- **Agent rule:** [`.cursor/rules/encore-originals-layout.mdc`](../../.cursor/rules/encore-originals-layout.mdc).

### Chord chart paste

Paste a formatted chart (section headers like `[Verse]`, chord-over-lyrics columns) on **Write lyrics** or **Brainstorm** — Encore imports sections and chord positions and opens **Add chords**. Parser: [`src/shared/music/chordPro/pastedChartImport.ts`](../../shared/music/chordPro/pastedChartImport.ts).

## Repertoire depth (how the pieces fit)

- **Milestones** are the main **structured** progress layer: a shared template on every song, per-row **To do / Done / N/A** (N/A is explicit and reversible), plus **song-only** rows for one-off goals. They answer “what done means” for this title in a scannable way.
- **Practice journal** (Markdown on each song) stays **first-class** for long-form nuance: arrangement notes, staging, or why a milestone does not apply. Use milestones for the checklist and the journal for everything that does not fit a checkbox.
- **Practicing** is a single boolean (“on my desk” / rotation). It does **not** auto-sync with milestone completion.
- **Performances** store **accompaniment** (vocal-only vs self-accompanied keys, etc.) for each logged show. That is gig history and filtering, separate from milestone rows.

## What sign-in enables (plain language)

- **Without Google:** Your library stays in this browser and works offline.
- **With Google:** Encore can keep a backup copy of your data in **your** Google Drive (`drive.file`), list file names in folders you point at (`drive.metadata.readonly`, for bulk performance import from a pasted folder and subfolders), export guided **practice exercises as Google Docs** (same **`drive.file`** scope: only Docs Encore creates or that you use with Encore—filed under `Encore_App/Practice exports/`), and read **your** YouTube playlists when you paste links for import (`youtube.readonly`). Encore does not post to YouTube. File **contents** still use `drive.file` (your Encore data file, picker selections, uploads); metadata listing does not download video or audio bytes.
- **Spotify:** Optional. Connect it from the **Account** menu for playlist import and track lookup. See **Spotify console** below for redirect and scope notes.

For UI copy conventions, see [`COPY_STYLE.md`](COPY_STYLE.md).

**Routing (GitHub Pages):** Encore keeps in-app navigation in the URL **hash** (see repo [`docs/adr/0001-static-hosting-hash-routing.md`](../../docs/adr/0001-static-hosting-hash-routing.md)). Deep links to a section use an in-fragment query, e.g. `#/song/<id>?scroll=encore-song-practice-heading`; the app scrolls then strips `?scroll=` from the hash.

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

| Variable                         | Purpose                                                                                                                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`          | Google Identity Services OAuth client (Web).                                                                                                                                                                                                                               |
| `VITE_GOOGLE_OAUTH_REDIRECT_URI` | Optional override for GIS `redirect_uri`. Default is **`{origin}/encore`** (no trailing slash). Set this only if your OAuth client lists a different string (e.g. `.../encore/`).                                                                                          |
| `VITE_ALLOWED_EMAIL_HASHES`      | Comma-separated **SHA-256 hex** digests of **normalized** emails (`trim` + lowercase). No plaintext emails in the repo.                                                                                                                                                    |
| `VITE_LABS_DRIVE_TESTER_HASHES`  | Optional. Same hash format for **Stanza / Scales** Google Drive backup. If empty at build time, those UIs reuse **`VITE_ALLOWED_EMAIL_HASHES`** so production does not need a duplicate secret.                                                                            |
| `VITE_SPOTIFY_CLIENT_ID`         | Spotify app (PKCE). Redirect URIs must match the dashboard (see **Spotify console** below).                                                                                                                                                                                |
| `VITE_LABS_SESSION_BFF_URL`      | Optional. Cloudflare Worker base URL (no trailing slash) for Google session refresh via ADR 0014. When set, sign-in and refresh use the BFF popup + cookie flow instead of GIS-only. See [`workers/labs-session-bff/README.md`](../../workers/labs-session-bff/README.md). |
| `VITE_GOOGLE_API_KEY`            | Browser **API key** (`AIza…`, **not** the OAuth client id). HTTP-referrer restricted; used for **guest** `alt=media` reads of `public_snapshot.json` and for **Google Picker** (`setDeveloperKey`). See **Browser API key** below.                                         |
| `VITE_GOOGLE_PICKER_APP_ID`      | Optional. Cloud **Project number** (digits only, from the Console dashboard) passed to Picker `setAppId`. Defaults to the numeric prefix of `VITE_GOOGLE_CLIENT_ID`. Set this if that prefix does not match your project number.                                           |
| `VITE_GOOGLE_PICKER_ORIGIN`      | Optional. **`protocol//host[:port]`** passed to Picker `setOrigin`. Use when Encore is embedded in a **cross-origin** iframe (parent origin cannot be read). Top-level Encore omits `setOrigin` (matches Google’s sample).                                                 |
| `VITE_ENCORE_SHARDED_SYNC`       | Optional. Set to `1` / `true` to opt in to the per-row sharded Drive layout (Phase 5 of the perf overhaul). When on, background sync pushes only changed rows + a small manifest. The legacy monolithic push still runs as a safety net. Off by default.                   |

**GitHub Pages (CI):** Production builds use the **`VITE_GOOGLE_API_KEY` repository secret** (or the same name on the **`github-pages` environment**). GitHub Actions injects it at build time for `.github/workflows/ci.yml`; it is not read from committed `src/.env.production`.

**Local dev without `.env.local`:** If `VITE_GOOGLE_API_KEY` is missing from your env files, `npm run dev` tries to load the same value from a GitHub Actions **variable** via the [`gh`](https://cli.github.com/) CLI (`gh variable get VITE_GOOGLE_API_KEY`, then the `github-pages` environment). **Secrets cannot be read back from GitHub** — mirror the key once as a repo or environment **variable** (Settings → Secrets and variables → Actions → Variables). `.env.local` still overrides when present.

### Allowlist workflow

1. Pick the Google account email you will use.
2. Compute SHA-256 of the normalized string (same rules as the app). Example with Node:

   `node -e "const c=require('crypto');console.log(c.createHash('sha256').update('you@example.com','utf8').digest('hex'))"`

3. Put that hex string in `VITE_ALLOWED_EMAIL_HASHES` for local dev or GitHub Actions secrets for deploy.

**Privacy note:** hashes hide emails from casual repo readers; they do not stop someone with resources from guessing common addresses against the published list.

### Google Cloud console

- Enable **Google Picker API**, **Google Drive API**, **Google Docs API**, **People API** (if needed), and **YouTube Data API v3** for playlist import.
- OAuth scopes requested by Encore (add all under **Google Auth Platform → Data access**): `drive.file`, **`drive.metadata.readonly`** (list names in pasted Drive folders and subfolders for bulk performance import), `userinfo.email`, **`userinfo.profile`** (given name for the greeting), and **`youtube.readonly`** (read playlists you own). Practice exports use the **Google Docs API** with the same **`drive.file`** scope (per-file access—[Google’s Docs auth table](https://developers.google.com/docs/api/auth) lists `drive.file` as the recommended non-sensitive option). After adding or changing scopes, users must **sign in to Google again** once so the new scope is granted. **Google Picker** still uses your browser API key plus OAuth; Encore does **not** request full `drive` / `documents` (all-files / all-Docs) access.
- **Authorized JavaScript origins** (Web client): add every origin you use (**no path**), e.g. `http://localhost:5173` and `http://127.0.0.1:5173` (match your Vite port). This is the main requirement for the GIS **token (popup)** flow. Missing origins often produce a vague “Something went wrong”.
- **Authorized redirect URIs:** Encore sends **`redirect_uri` = `{origin}/encore`** (no trailing slash), e.g. `http://127.0.0.1:5173/encore`. Google compares this string **byte-for-byte** to your list. A trailing slash on only one side causes **`redirect_uri_mismatch`**, so either register **`.../encore`** (recommended, matches the app default) or add **`.../encore/`** and set **`VITE_GOOGLE_OAUTH_REDIRECT_URI`** to that exact URL. Typical set:
  - `http://localhost:5173/encore`
  - `http://127.0.0.1:5173/encore`
  - `https://labs.tiffzhang.com/encore` (production)
- **Session BFF (when `VITE_LABS_SESSION_BFF_URL` is set):** also register **`https://<your-worker>/v1/oauth/google/callback`** on the same Web client (see [`workers/labs-session-bff/README.md`](../../workers/labs-session-bff/README.md)). GIS **`.../encore`** redirect URIs remain for legacy/fallback builds.
- **Google Picker (manual QA):** From a song, open **Browse Drive** under charts or in the performance editor, or **Browse Drive** in the chart file dialog. If the overlay shows **“The API developer key is invalid”**, enable **Google Picker API** and **Google Drive API** for the key’s Cloud project, include both under the key’s **API restrictions**, and add your dev **HTTP referrers** (see below). If the overlay appears blank or errors after idle, **Sign in with Google** again so the access token is fresh.
- **Drive upload folders (Repertoire settings) and bulk import:** You can **paste a folder URL or id** and apply; Encore checks the id with the Drive Files API (folder mime type) using your OAuth token, so that path works even when **Google Picker** is misconfigured. **Pick folder in Drive** still needs a valid browser API key and Picker-enabled project; fixing the key remains the best long-term setup.

#### Browser API key (`VITE_GOOGLE_API_KEY`) — Picker + guest reads

Create this in **Google Cloud Console → APIs & Services → Credentials → Create credentials → API key**. It is **not** the same string as `VITE_GOOGLE_CLIENT_ID` (that value ends in `.apps.googleusercontent.com` and is only for OAuth).

1. **Application restrictions:** choose **HTTP referrers (web sites)** and list **every origin** where Encore runs, **with a path wildcard**. Dev defaults to **`127.0.0.1`** (see **Development: one browser origin**); the referrer Google sends uses that host, not `localhost`, after the in-app redirect. Typical entries (adjust the port to match Vite, often `5173`):
   - `http://127.0.0.1:5173/*`
   - `http://localhost:5173/*` (optional backup if you ever load without redirect)
   - Production: `https://labs.tiffzhang.com/*` (or your host)
     Missing **`127.0.0.1`** in the key’s referrer list is the usual cause of Google’s **“There was an error! The API developer key is invalid.”** in local development.
2. **API restrictions:** restrict the key and allow **Google Drive API** and **Google Picker API** (enable both APIs under **APIs & Services → Library** in the same project first). The Picker UI calls the Picker API; omission is a common cause of **“The API developer key is invalid.”** when clicking **Browse Drive**.
3. Put the key in **`src/.env.local`** as `VITE_GOOGLE_API_KEY=…`, then **restart** `npm run dev` so Vite picks it up. **Do not** put this key in committed `src/.env.development`; that file is shared in git, while `.env.local` stays on your machine only.

   **Or** skip the local file: add a GitHub Actions **variable** named `VITE_GOOGLE_API_KEY` (same value as the CI secret), run `gh auth login`, then `npm run dev` will pull it automatically. Secrets alone are not enough — GitHub does not expose secret values to `gh`.

**Local dev + guest snapshot reads:** Browsers load `public_snapshot.json` via the Drive API using this key. Referrer-restricted keys often make **direct** `googleapis.com` requests fail CORS on `http://127.0.0.1:…` even when the key is valid. With `npm run dev`, Encore uses a **same-origin Vite proxy** for those reads so publish checks and the guest view work without relaxing key restrictions. The proxy sends `Referer: http://<your-dev-host>/encore/` by default (from the incoming request’s `Host`). If your key’s allowlist only includes **production** (e.g. `https://labs.example.com/*` but **not** loopback), set **`VITE_GOOGLE_DRIVE_DEV_PROXY_REFERER`** in `.env.local` to that production origin with path, for example `https://labs.example.com/encore/`, so outbound Drive requests match an allowed referrer.

**Production guest reads:** When **`VITE_LABS_SESSION_BFF_URL`** is set (production default), Encore routes guest snapshot fetches through the session BFF (`GET /v1/public-drive/files/:id/media` and `/meta`). The Worker calls Google Drive **server-side** with the same API key (stored as Worker secret **`GOOGLE_API_KEY`**) and a fixed **`GOOGLE_DRIVE_REFERER`** (`https://labs.tiffzhang.com/encore/`). That avoids browser CORS failures and misleading **404** responses from direct `alt=media` fetches. After deploying Worker changes, run `npx wrangler secret put GOOGLE_API_KEY` in `workers/labs-session-bff/` (same value as `VITE_GOOGLE_API_KEY`). See [`workers/labs-session-bff/README.md`](../../workers/labs-session-bff/README.md).

- **Staying signed in:** Encore stores the short-lived Google access token in **`localStorage`** (with expiry). On load, if that token is **still within its saved expiry window**, Encore uses it directly — no GIS handshake. Once the token expires, the account menu surfaces **"Sign in to sync"** and the only path back to a fresh token is a user click on **Sign in again**, which opens the GIS popup synchronously. **Encore never silently refreshes Google sign-in in the background** — see [ADR 0010](../../docs/adr/0010-encore-no-background-google-refresh.md) for the trade-off and history. A cross-tab `storage` event listener does propagate a sign-in from one tab to its siblings without any popup, so multi-tab users only click in one place. **TokenClient instances are cached** per `(client_id, scope, login_hint)` tuple to avoid leaking GIS `accounts.google.com/gsi/transform` iframes across hours of use (each `initTokenClient` mounts an iframe GIS does not garbage-collect). **Disconnect Google** is in the **Account** menu (top right) and clears that storage plus calls Google’s **`revoke`**. Treat Encore like any SPA with a stored OAuth token: XSS on this origin could exfiltrate it until expiry. **Spotify** access and refresh tokens are also stored in **`localStorage`** (PKCE verifier and OAuth `state` stay in **`sessionStorage`** only for the redirect round-trip). **Connect / Disconnect Spotify** live in the same Account menu; Spotify is optional for playlist import and song metadata.

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
- **Playlist sync `403 Forbidden` (writing back to Spotify):** since Spotify’s **February 2026** Development-mode change, the legacy **`PUT /v1/playlists/{id}/tracks`** write endpoint returns 403 even for the playlist owner with `playlist-modify-public` granted, and the only fix is calling the new **`PUT /v1/playlists/{id}/items`** endpoint. Encore now writes to `/items` for both saved-search rewrites and the practicing-songs sync. If you still see 403 after updating to the latest build, double-check that the linked Spotify account is on the app’s **User management** list and use Account menu → **Refresh Spotify login** so the stored token has `playlist-modify-public` (or `playlist-modify-private` for non-public playlists).

## Library: playlist import

From **Library → Import playlists**, paste **Spotify** and/or **YouTube** playlist URLs or ids in **one box** (one playlist per line, or **comma-separated**). Encore infers each line’s platform from the URL. If both sides have tracks, Encore suggests YouTube links per track using title similarity; adjust the **Link YouTube** dropdown before importing. Songs get optional `spotifyTrackId` / `youtubeVideoId` fields (editable on the song page).

## Drive layout (auto-created)

Under **My Drive**:

- `Encore_App/repertoire_data.json` — canonical merged data (the monolithic format used by every published Encore release).
- `Encore_App/repertoire/` — per-row sharded layout (Phase 5, behind `VITE_ENCORE_SHARDED_SYNC`). Contains `manifest.json` plus `song/<id>.json`, `performance/<id>.json`, and `extras/default.json`. The background sync pushes only the rows you actually edited and updates the manifest in one round-trip; pulls fetch only shards whose manifest `updatedAt` is newer than the local row. The legacy file keeps being updated alongside until the sharded path graduates.
- `Encore_App/Performances/` — shortcuts to performance videos.
- `Encore_App/SheetMusic/` — reserved for your own organization (IDs stored per song).
- `Encore_App/public_snapshot.json` — created/updated when you use **Share** (link-readable). Snapshot publish resolves performance video links with **limited parallelism** (a few Drive metadata probes at a time) so large repertoires do not open dozens of simultaneous anonymous `files.get` calls, which can otherwise trigger Google’s “automated queries” interstitial during heavy local testing.

## Guest URLs

Format: `https://labs.tiffzhang.com/encore/#/share/<FILE_ID>` where `FILE_ID` is the Drive id of `public_snapshot.json`.

## Architecture in 60 seconds

For the full module diagram, see [`ARCHITECTURE.md`](ARCHITECTURE.md). Key points:

### Provider stack

`src/encore/main.tsx` mounts a single `<EncoreProvider>` that composes (outside-in):

```
LabsUndoProvider                       // src/shared/undo/LabsUndoContext.tsx
  └─ EncoreBlockingJobProvider         // src/encore/context/EncoreBlockingJobContext.tsx
       └─ EncoreAuthProvider           // Google + Spotify session state
            └─ EncoreLibraryProvider   // reactive Dexie selectors (useLiveQuery)
                 └─ EncoreSyncProvider // Drive sync + conflict state
                      └─ EncoreActionsProvider // CRUD + bulk ops + dirty-row marking
```

- `LabsUndoProvider` owns keyboard undo/redo (Ctrl/Cmd-Z, Ctrl/Cmd-Shift-Z / Ctrl-Y) and a per-app stack (`labsUndoStack`). **No header undo buttons** — discoverability is via **Keyboard shortcuts** (Ctrl/Cmd+?). See [`src/shared/undo/README.md`](../shared/undo/README.md).
- `EncoreBlockingJobProvider` exposes `useEncoreBlockingJobs().withBlockingJob(label, fn)`. Any background work that the user shouldn't navigate away from goes through it. The provider renders a single bottom snackbar with progress + a "keep this tab open" caption (see [§ Long-running jobs](#long-running-jobs)) and registers a `beforeunload` warning **only while at least one non-silent job is running** (silent jobs such as debounced Drive push do not trigger “Leave site?”).
- The four Encore providers are split by responsibility so each consumer only re-renders on the slice it cares about. New code should reach for the specialized hooks (`useEncoreAuth`, `useEncoreLibrary`, `useEncoreSync`, `useEncoreActions`); `useEncore()` remains as a back-compat façade that flattens all four.
- The library context is reactive: it subscribes to the Dexie `songs`, `performances`, and `repertoireExtras` tables via `dexie-react-hooks#useLiveQuery`, so writes from anywhere (other tabs included) propagate without an explicit refresh call.

### Long-running jobs

Always wrap user-launched async work in `withBlockingJob` (or `startBlockingJob` for streaming progress). Examples:

- Drive sync: `runSync` in `EncoreSyncContext`
- Snapshot publish/unpublish: `publishPublicSnapshot` / `unpublishPublicSnapshot`
- Drive reorganize: `reorganizeDriveUploads`
- Bulk imports: `applyImport` (PlaylistImportDialog), `applyAll` (BulkScoreImportDialog, BulkPerformanceImportDialog)
- Drive uploads (chart, performance video): `handleDriveChartUpload`, `onPickVideoFile`

Rule of thumb: **anything > 1 s that writes to Drive or Dexie should be wrapped**. Synchronous edits and quick local ops do not need it. **`scheduleBackgroundSync`** uses a **silent** `withBlockingJob` (no snackbar, no `beforeunload`) and is **debounced + serialized** so rapid saves coalesce. **`runSync`** (initial / retry Drive sync) is also **silent** so login does not show the bottom snackbar or unload prompts; use **Account → Drive status** (“Syncing…”) for feedback.

### Undo coverage

`LabsUndoProvider` plus per-action `pushUndo` calls in `EncoreActionsContext` cover:

- Save song, delete song
- Save performance, delete performance
- Set primary reference / backing / chart
- Tag edits (add / remove / clear)
- Bulk operations (PR 4 will batch these into one undo entry)

Intentionally excluded:

- Drive sync, conflict resolution, snapshot publish (these are remote side-effects, not local edits)
- Spotify OAuth flows, sign-in/out
- Autosave debounce ticks (PR 4 collapses these so a draft commit pushes one undo, not many)

### `runSync` vs `scheduleBackgroundSync`

- `runSync()` runs after sign-in / token restore (once `libraryReady`, after a paint deferral) and when the user retries Drive sync. It uses **`withBlockingJob(..., { silent: true })`** and passes progress into `runInitialSyncIfPossible` for optional future UI. The result also includes a row-level `analysis` (`localOnly` / `remoteOnly` / `bothEdited`); when `bothEdited.length === 0` the sync silently auto-merges and surfaces a brief snackbar via `EncoreSyncContext.lastSilentMerge`. Otherwise the `<SyncConflictReviewDialog>` opens with only the overlapping rows for per-row resolution.
- `scheduleBackgroundSync()` fires after most local writes: **500ms debounce**, then a **serialized** silent blocking job. When `VITE_ENCORE_SHARDED_SYNC=1` it first runs the one-shot migration into the per-row layout, drains the `dirtySync` table via `pushDirtyShards`, and then re-emits the legacy `repertoire_data.json` as a safety net. With the flag off it pushes the monolithic file only. Failures set `syncState` / `syncMessage`.

### List screen performance (Library, Performances, Originals, Practice)

Keep MRT tables scroll-friendly: stable row/cell `sx`, debounced search feeding `data`, complete `columns` memo dependencies, and avoid zebra rows if paint cost matters. **Keep-alive tabs** (`EncoreMainShell`): each list section stays mounted after first visit (`display: none` when inactive). Inactive tabs skip heavy derived work — `heavyListTabActive` / `listActive` / `practiceTabActive` gate filter rows, MRT columns, and (on Practice) the song media hub JSX tree (`hubActive` on `useSongPageMediaHub`). **Frozen tab bodies:** each list screen uses a thin wrapper (`useEncoreLibraryTables`, …) plus a memoized body fed by `useEncoreTabFrozenSnapshot` so Dexie writes do not re-render hidden tabs; primary tab clicks use `startTransition` for responsive paint. Prefer slice hooks (`useEncoreLibraryTables`, `useEncoreAuth`, …) over legacy `useEncore()` so Dexie writes do not re-render unrelated chrome (e.g. Account menu). Agent checklist: [`.cursor/rules/encore-list-tab-performance.mdc`](../.cursor/rules/encore-list-tab-performance.mdc). **Originals** uses the same keep-alive tab pattern as Library/Performances: skip filter rebuilds when the tab is hidden (`listActive`), debounce search (~220ms), and stabilize the Dexie `originals` array ref when row ids/`updatedAt` are unchanged. Grid cards receive playback state from the list parent (not per-card context) and defer IndexedDB `hasOriginalTakeBlob` probes until the card is near the viewport. **Media playback** splits control plane vs transport (`EncoreMediaPlaybackControlsContext` / `EncoreMediaTransportContext`) so `timeupdate` does not re-render list/grid cards. Initial Drive sync waits for first paint plus an idle callback before blocking work. Tab switch budgets: [`CUJs.md`](CUJs.md) CUJ-001 + `e2e/smoke/encore-tab-navigation-interaction.spec.ts`. See [`ARCHITECTURE.md`](ARCHITECTURE.md) § Client performance guardrails.

### `EncoreMediaLink[]` model

Songs persist `referenceLinks: EncoreMediaLink[]` and `backingLinks: EncoreMediaLink[]`. Each link is a Spotify track, YouTube video, or Drive file with `id`, `source`, `isPrimaryReference?`/`isPrimaryBacking?`, and an optional human `label`. The legacy single-id fields (`spotifyTrackId`, `youtubeVideoId`) are mirrored into `referenceLinks` by `ensureSongHasDerivedMediaLinks` (and the legacy mirror is kept in sync by `syncSongLegacyMediaIds`). Read media via `referenceLinks` / `backingLinks`; write via the helpers in [`src/encore/repertoire/songMediaLinks.ts`](repertoire/songMediaLinks.ts) (e.g. `appendSpotifyReferenceLink`, `removeMediaLinkById`, `setPrimaryReferenceLinkId`).

### Performances — drag-and-drop, playback, UX

See **[`PERFORMANCE_UX.md`](PERFORMANCE_UX.md)** for interaction design (Gestalt grouping, modal vs detail page, video source cards).

- **Performance videos** use `DragDropFileUpload` (via `PerformanceAddVideoSourceStrip`) inside `PerformanceEditorDialog` only — do not add a second Paper-level drag handler on the same surface (that leaves a stuck outline).
- **Section drops** (song page Performances card, Practice tab compact list) use `usePerformanceSectionDrop`, which sets `encoreDropSurface` to `'performance'` and routes video files into the log-performance flow.
- **While the performance modal is open**, `encoreDropSurface` is `'performance-modal'`; SongPage / PracticeScreen document listeners call `shouldEncoreMediaHubHighlightDrag()` and skip the media-hub Takes / Listen intent path for performance-video drags (`encoreDragPayload.eligibleSlotsForDragDataTransfer` returns `null` when the performance surface is active).
- **In-app playback:** `performanceVideoPlaybackTarget` + `useEncoreMediaPlaybackHoverProps().propsForPerformance` feed Play on song grid cards and the Practice compact list; Drive performance videos float above the playback bar (same shell as YouTube); **key shift** works for Drive audio and video (video picture stays native; audio routes through Web Audio when shifted); **session cache** keeps recently played Drive blobs in memory so replay skips re-download; external Open remains secondary.
- **Multi-video stack:** `EncorePerformance.videos[]` + `primaryVideoId` (legacy single-video fields kept in sync via `performanceVideoModel`). Drop a video onto an existing performance card to open the editor in add-video mode (metadata locked). The **+N videos** chip on song/practice performance rows opens a browse popover (play or open any clip).

### Hover cards + media-link rows

- `<EncoreMediaLinkRow>` ([`ui/EncoreMediaLinkRow.tsx`](ui/EncoreMediaLinkRow.tsx)) is the shared row used for reference, backing, and chart strips on SongPage. Use it whenever you render a single Spotify/YouTube/Drive link with optional primary star + open + remove affordances.
- `<EncoreStreamingHoverCard>` ([`components/EncoreStreamingHoverCard.tsx`](components/EncoreStreamingHoverCard.tsx)) wraps a media row to fetch and show resolved track / video metadata on hover (Spotify Web API for tracks, YouTube oEmbed for videos).
- `<EncoreSpotifyTrackListRow>` ([`ui/EncoreSpotifyTrackListRow.tsx`](ui/EncoreSpotifyTrackListRow.tsx)) is the shared album-art + title + artist row used in Spotify search autocomplete (`renderSpotifyTrackAutocompleteOption`) and in `PlaylistImportDialog`'s manual Spotify picker.
