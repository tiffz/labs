# ADR 0032: Other apps read Encore's originals, read-only, through one shared reader

## Status

**Accepted** (October 2026). Code: `src/shared/federation/encoreOriginalsReader.ts`. First reader:
Lyrefly's Sketchbook ("Songs from Encore"). Design:
[`docs/design-explorations/lyrefly-songs-and-publishing.md`](../design-explorations/lyrefly-songs-and-publishing.md) § 1.

## Context

The owner writes songs in Encore and wants them in Lyrefly's Sketchbook as ideas to develop into
comics. Apps may not import each other, and Encore's IndexedDB is its private working copy, with a
schema that changes on Dexie bumps. Encore's Drive layout is what its own devices already depend on.

## Decision

1. **Encore owns its songs. Other apps only read them.** The shared reader imports Drive read
   helpers only (`driveGetMedia`, `driveListFiles`); a guardrail test fails on any other import.
2. **The Drive layout is the contract:** `My Drive/Encore_App/Originals/originals_manifest.json`,
   each song opened by the manifest's `fileId`, never by name (a push fallback can leave a stale
   second file). A test in `src/encore/` round-trips a real Encore song row through the reader and
   compares the folder and manifest names to Encore's own constants.
3. **"Can't check" is never "no songs".** No Encore folder, no manifest, a Drive error, or no sign-in
   come back as `unavailable` with a reason.
4. **A comic keeps a snapshot of the song it adapts** (`ComicProject.sources`): the song text it was
   built from, with Encore's `updatedAt` at the time. The comic's id derives from the song id, so a
   song starts one comic, on any device.

## Consequences

- Renaming Encore's originals folder, manifest, or the song fields `id`, `title`, `lyricsAndChords`,
  `updatedAt` now fails a test until the reader moves with it.
- Each Sketchbook visit lists the manifest and fetches song files this tab has not read at their
  current version. Fine for dozens of songs; cache across visits before hundreds.
- Not built yet: telling a comic its song changed since the snapshot, and Encore → Lyrefly handoff.
