# The Gesture Room

Timed drawing practice from your own Google Drive photo collections.

**Route:** `/gesture/` · Dev: `http://127.0.0.1:5173/gesture/`

## What it does

- **Practice** tab: pick collections, set the timer, and enter zen mode immediately.
- **Collections** tab: upload a local folder (uses the folder name), upload loose photos, or link a Drive folder.
- Collections show **photo previews** so you know what is inside without tags or notes.
- Track drawn photos and sync progress across devices via `progress.json`.

Reference photos are shown via OAuth **thumbnail URLs** in `<img>` elements (with authenticated `alt=media` fallback when thumbnails fail).

## Design

**Linen (polished)** — editorial serif wordmark, layered linen canvas, segmented tabs, preview hover zoom, sage accent `#5f8566`.

Full principles for agents: [`DESIGN.md`](DESIGN.md) · upload UX: [`UPLOAD_UX.md`](UPLOAD_UX.md) · tokens: [`design/linenTheme.ts`](design/linenTheme.ts)

To explore alternatives before locking in, use skill [`labs-ui-design-variations`](../../.cursor/skills/labs-ui-design-variations/SKILL.md) — then codify the winner in `DESIGN.md` and remove preview tooling.

## Google OAuth

Uses the shared Labs session (BFF when configured, GIS fallback). Scopes match Encore portfolio apps:

- `drive.file`
- `drive.metadata.readonly`
- `userinfo.email` / `userinfo.profile`

Drive backup follows the portfolio pattern documented in [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md).

## Env

Same as other Drive-backed Labs apps:

- `VITE_GOOGLE_CLIENT_ID`
- Optional: `VITE_LABS_SESSION_BFF_URL`, `VITE_GOOGLE_API_KEY`

See [`src/.env.local.example`](../.env.local.example).

## Tests

```bash
npm test -- src/gesture
npm run test:e2e:smoke
```

## Keyboard (zen session)

| Key    | Action         |
| ------ | -------------- |
| Space  | Pause / resume |
| → or N | Skip           |
| ← or B | Previous       |
| Esc    | End session    |
