# Encore

Personal musical repertoire companion: **local-first** (Dexie) with optional **Google Drive** sync, plus optional **public snapshot** for read-only sharing.

**Agents:** [`AGENTS.md`](AGENTS.md) → then the doc that matches the task.

| Topic                      | Doc                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync / Drive contracts     | [`ARCHITECTURE.md`](ARCHITECTURE.md) · repo [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) · [`docs/SYNC_AND_AUTH_MAP.md`](../../docs/SYNC_AND_AUTH_MAP.md) |
| Journeys + budgets         | [`CUJs.md`](CUJs.md)                                                                                                                                                      |
| Performance log / video UX | [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md)                                                                                                                                  |
| Originals chord paint      | [`originals/DEVELOPMENT.md`](originals/DEVELOPMENT.md)                                                                                                                    |
| Copy                       | [`COPY_STYLE.md`](COPY_STYLE.md)                                                                                                                                          |
| UI primitives              | [`UI_PRIMITIVES.md`](UI_PRIMITIVES.md)                                                                                                                                    |

**Audience:** Singer-first. Piano / self-accompaniment are secondary detail (performance history/filters), not a separate learning app.

## Product constraints

- **Originals** — separate tab/domain (brainstorm, ChordPro, demos). IndexedDB `originals` + Drive `Encore_App/Originals/`. Does not mix into repertoire `EncoreSong` rows (v1). ADR [0012](../../docs/adr/0012-encore-originals-local-first-domain.md). Layout: `.cursor/rules/encore-originals-layout.mdc`.
- **Milestones** — structured progress checklist; **practice journal** (Markdown) for nuance; **Practicing** is a boolean (does not auto-sync from milestones); **performances** store accompaniment for gig history.
- **Without Google:** library stays in this browser. **With Google:** Drive backup (`drive.file`), folder listing for bulk import (`drive.metadata.readonly`), practice Docs under `Encore_App/Practice exports/`, YouTube playlist read (`youtube.readonly`). Spotify optional (Account menu).

## Routing and origins

- Hash routing on GitHub Pages ([ADR 0001](../../docs/adr/0001-static-hosting-hash-routing.md)): `#/library`, `#/song/<id>`, `#/practice`, `#/originals`, `#/share/<fileId>`, …
- Deep-link scroll: `#/song/<id>?scroll=encore-song-practice-heading` (stripped after scroll).
- **Dev:** `localhost` → redirect to `127.0.0.1` so IndexedDB + Spotify PKCE share one origin. Prefer `127.0.0.1` always in local Labs.

## Environment

Vite **`root` is `src/`** — env files live under `src/` (`src/.env.development`, `src/.env.production`, optional `src/.env.local`).

| Variable                                                  | Purpose                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`                                   | GIS OAuth Web client                                                   |
| `VITE_GOOGLE_OAUTH_REDIRECT_URI`                          | Optional; default `{origin}/encore` (no trailing slash)                |
| `VITE_ALLOWED_EMAIL_HASHES`                               | SHA-256 hex of normalized emails (allowlist)                           |
| `VITE_LABS_DRIVE_TESTER_HASHES`                           | Optional Stanza/Scales Drive gate (falls back to allowlist)            |
| `VITE_SPOTIFY_CLIENT_ID`                                  | Spotify PKCE                                                           |
| `VITE_LABS_SESSION_BFF_URL`                               | Optional session BFF base (ADR 0014)                                   |
| `VITE_GOOGLE_API_KEY`                                     | Browser API key — Picker + guest `alt=media` (not the OAuth client id) |
| `VITE_GOOGLE_PICKER_APP_ID` / `VITE_GOOGLE_PICKER_ORIGIN` | Optional Picker project number / iframe origin                         |
| `VITE_ENCORE_SHARDED_SYNC`                                | `1`/`true` for per-row sharded Drive layout                            |

**CI:** production builds inject `VITE_GOOGLE_API_KEY` from GitHub secrets. Local: `.env.local` or `gh variable get VITE_GOOGLE_API_KEY`. Allowlist: `node -e "…sha256…"` of lowercase trimmed email.

### Google Cloud (ops)

- Enable Picker, Drive, Docs, YouTube Data v3; scopes: `drive.file`, `drive.metadata.readonly`, `userinfo.email`, `userinfo.profile`, `youtube.readonly`. Re-sign-in after scope changes.
- **JS origins** (no path): `http://127.0.0.1:5173`, `http://localhost:5173`, production host.
- **Redirect URIs** (byte-exact): `{origin}/encore` — and BFF callback when `VITE_LABS_SESSION_BFF_URL` is set ([`workers/labs-session-bff/README.md`](../../workers/labs-session-bff/README.md)).
- **No silent Google refresh** — [ADR 0010](../../docs/adr/0010-encore-no-background-google-refresh.md). Token in `localStorage` until expiry; user clicks **Sign in again**.

### Browser API key + guest reads

HTTP-referrer-restricted key; allow `http://127.0.0.1:5173/*` and production. API restrictions: Drive + Picker. **Dev:** Vite same-origin proxy for guest `public_snapshot.json` (CORS). **Production:** guest fetches via session BFF (`GOOGLE_API_KEY` Worker secret) — see CUJ-006 and BFF README. Paste folder id still works via OAuth without Picker.

### Spotify

PKCE; redirect host must be **`127.0.0.1`** (not `localhost`). Scopes: `playlist-read-private`, `playlist-read-collaborative`; writes use `PUT …/items` (not legacy `/tracks`). Development-mode apps need users on Spotify **User management**.

## Drive layout

Under **My Drive → `Encore_App/`**:

- `repertoire_data.json` — monolithic canonical file
- `repertoire/` — sharded layout when `VITE_ENCORE_SHARDED_SYNC` (manifest + per-row JSON); legacy file still written during soak
- `Performances/`, `SheetMusic/`, `Originals/`, `public_snapshot.json` (Share)

**Guest URL:** `…/encore/#/share/<FILE_ID>` — journey: [`CUJs.md`](CUJs.md) CUJ-006.

## Library imports

**Import playlists** — paste Spotify and/or YouTube URLs (one per line). Optional YouTube↔Spotify linking by title similarity. Fields: `spotifyTrackId` / `youtubeVideoId` (also mirrored into `referenceLinks` / `backingLinks` — see ARCHITECTURE).

## Architecture pointer

Provider stack (outside-in): `LabsUndoProvider` → `EncoreBlockingJobProvider` → Auth → Library → Sync → Actions. Use slice hooks (`useEncoreAuth`, …); `useEncore()` is a back-compat façade. Sync state machine, sharded layout, Dexie tables, and module map: **[`ARCHITECTURE.md`](ARCHITECTURE.md)**. Long jobs: `withBlockingJob`; silent for debounced Drive push / initial sync. Undo: [`src/shared/undo/README.md`](../shared/undo/README.md).
