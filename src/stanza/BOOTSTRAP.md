# Stanza playback bootstrap

How Stanza picks the first song on load and resolves URL deep links. Implemented in `hooks/useStanzaPlaybackBootstrap.ts`.

## Precedence (first match wins)

1. **`?v=`** — YouTube video id. Creates a library row if needed, then selects it.
2. **`?df=`** — Google Drive file id. Imports or selects by `driveSourceFileId`. Tombstoned ids show a re-add prompt (ADR 0006).
3. **`?f=`** — Local media fingerprint (Beat SHA256 or Stanza `size:duration`). Runs `ensureBeatLibraryImported()` first so Find the Beat rows exist, then resolves the song. Resolution **retries when the library updates** (e.g. after Drive auto-pull) and defers the “not found” alert briefly so sync can finish.
4. **Last selected** — `localStorage` key from `stanzaLastSelectedSong.ts` when no competing URL params.
5. **Hero** — Empty library landing when none of the above apply.

## First paint / hero flash

`readInitialStanzaViewerIntent()` runs synchronously before React paint:

- Restores `selectedId` from last-selected when safe.
- Sets `viewerShellPending` when a viewer is expected (URL params or last song).
- The landing hero renders only when `!viewerShellPending && !selectedId && songs !== undefined`.
- While Dexie hydrates, a lightweight spinner replaces the hero instead of flashing it.

## Beat library migration

`useBeatLibraryMigration()` calls `ensureBeatLibraryImported()` once on mount (deduped). This upgrades legacy Beat imports (fingerprints, marker ids, metronome defaults) and imports any remaining Beat IDB rows. A toast summarizes imports when rows change.

## History

`popstate` re-runs URL resolution so browser Back/Forward matches in-app navigation (`navigateToSong` / `goHome` push history entries).

## Related

- `utils/stanzaDriveUrlParams.ts` — query param read/write
- `import/beatLibraryImport.ts` — Find the Beat → Stanza migration
- `import/BEAT_MIGRATION.md` — intentional gaps and merge rules (why migrated songs can feel different)
- `db/stanzaLastSelectedSong.ts` — last-opened persistence
