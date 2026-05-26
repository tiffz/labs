# ADR 0012: Encore Originals as a separate local-first domain

## Status

Accepted

## Context

Encore’s repertoire model (`EncoreSong`, `repertoire_data.json`, sharded `Encore_App/repertoire/`) is optimized for **singer-first** practice: charts, reference recordings, performances, milestones, and Genius-style lyric exercises. Songwriters need a separate space for **original compositions**: ChordPro charts, brainstorm markdown, demo takes, and local version history without overloading repertoire rows or sync semantics.

The product spec calls for IndexedDB storage, Google Drive backup, snapshot-on-idle, and rich editors. Labs already uses Dexie + debounced Drive push in Encore ([`EncoreSyncContext`](../../src/encore/context/EncoreSyncContext.tsx)), hash routing ([ADR 0001](./0001-static-hosting-hash-routing.md)), and `Encore_App/` as the canonical Drive tree ([ADR 0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md)).

## Decision

1. **Separate domain** — `EncoreOriginalSong` lives in its own Dexie table (`originals`). It does **not** appear in `EncoreSong` or `repertoire_data.json` in v1. There is **no** “promote to repertoire” bridge yet.

2. **Drive layout** — Under the existing `Encore_App/` root:
   - `Encore_App/Originals/originals_manifest.json`
   - `Encore_App/Originals/song/<id>.json` (metadata + ChordPro; takes reference `driveFileId` only)
   - `Encore_App/Originals/audio/` (binary demo takes)

3. **Sync** — Reuse the dirty-row + sharded manifest pattern with `dirtySync.kind === 'original'`. Background push runs **after** repertoire shard/monolith push in the same serialized chain. Pull runs on `runSync` via `pullChangedOriginalsShards`.

4. **Local-only history** — `SongSnapshot` entries (idle capture after ~3s) are stored in the Dexie row’s `history` array (capped). They are **not** uploaded as separate Drive files.

5. **Audio** — v1 is **Drive-first** for take bytes; JSON stores `AudioTake` metadata and `driveFileId`. Optional local blob cache is deferred.

6. **Spark It** — Composition suggestions are **rule-based** (offline heuristics), not LLM calls.

## Consequences

- New Encore tab and hash routes (`#/originals`, `#/originals/<id>`).
- `DirtySyncRow.kind` gains `'original'`; repertoire `pushDirtyShards` ignores that kind.
- `SyncMetaRow` gains originals folder/manifest ids.
- Bundle may grow for lazy-loaded rhyme (CMU) and PDF import (`pdfjs-dist`); both must be code-split.
- Future: guest share, repertoire promotion, Stanza overlay for originals charts.

## Alternatives considered

- **Embed originals in `EncoreSong`** — rejected: different fields, sync grain, and UX; risks repertoire merge/conflict noise.
- **Separate micro-app** — rejected: same Google session, shell, and `Encore_App/` tree; tab + module is enough.

## Links

- [`src/encore/originals/types.ts`](../../src/encore/originals/types.ts)
- [`src/encore/originals/drive/originalsSharded.ts`](../../src/encore/originals/drive/originalsSharded.ts)
- [`src/encore/drive/constants.ts`](../../src/encore/drive/constants.ts)
