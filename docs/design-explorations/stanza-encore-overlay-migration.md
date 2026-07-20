# Stanza ↔ Encore overlay migration (deferred)

**Status:** Option B accepted — portfolio conflict gate + tester GA + Encore stem dedup landed. Steps 1–2 (dual-read pull, dual-write push) are **implemented** in [`useStanzaDriveBackup.tsx`](../../src/stanza/hooks/useStanzaDriveBackup.tsx) via `stanzaPracticeOverlaySync.ts`; steps 3–5 (Encore repertoire read, migration utility, legacy deprecation) remain.

## Scaffolding in repo

| Artifact                                                                               | Purpose                                                           |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`STANZA_PRACTICE_OVERLAY_FILE_NAME`](../../src/stanza/drive/stanzaPracticeOverlay.ts) | Sidecar filename under `Encore_App/`                              |
| [`stanzaPracticeOverlay.ts`](../../src/stanza/drive/stanzaPracticeOverlay.ts)          | V1 schema + type guard (wired via `stanzaPracticeOverlaySync.ts`) |

## Implementation checklist (after sign-off)

1. **Dual-read pull** — Stanza session start reads legacy `progress.json` + `stanza_practice_overlay.json`; merge into Dexie using existing marker-safe rules.
2. **Dual-write push** — Write overlay primary; mirror minimal slice to legacy `progress.json` for one release.
3. **Encore repertoire read** — Optional read-only pull of linked `EncoreSong` rows for titles / Drive refs (monolith + sharded paths).
4. **Migration utility** — One-time merge from legacy-only markers into overlay keys (`encoreSongId`, `drive:…`, `yt:…`).
5. **Deprecate legacy** — Stop writing `Tiff Zhang Labs/Stanza/progress.json`; document restore path.
6. **Tests** — Overlay parse/merge unit tests; hook integration with mocked Drive.

## Non-goals until overlay ships

- Removing tester gate (separate product decision)
- Stanza uploading new Encore reference/backing files (separate product decision)

See [`docs/LOCAL_FIRST_SYNC.md`](../LOCAL_FIRST_SYNC.md) for current sync behavior.
