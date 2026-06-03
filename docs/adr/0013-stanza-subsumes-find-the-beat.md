# ADR 0013: Stanza subsumes Find the Beat

## Status

Accepted

## Context

Labs ships two overlapping practice surfaces:

- **Find the Beat** (`/beat/`) — analysis-first: auto BPM, chord/key detection, spectral section detection, lane-based practice editing, local IndexedDB library (`beat-finder-library`).
- **Stanza** (`/stanza/`) — manual-first: marker-based sections, tap tempo, Drive backup, Encore deep links, multi-stem mix, focus-time stats.

Encore already routes “Practice” to Stanza ([ADR 0007](./0007-encore-owned-practice-resources-stanza-secondary-client.md)). The full Essentia tempo pipeline already lives in `src/shared/beat/` and powers Stanza’s optional **Analyze** metronome path ([ADR 0005](./0005-shared-find-the-beat-analyzer.md)).

Maintaining two apps duplicates persistence, UX patterns, and regression surface area. Product preference is **manual input first**, with automation as an optional seed layer — Stanza’s model.

## Decision

1. **Stanza is the single user-facing practice app.** Find the Beat enters maintenance mode and `/beat/` redirects to `/stanza/` after a one-time library import path exists.

2. **Automation from Beat is ported as optional actions**, never silent overwrite:
   - Whole-song / section **Analyze tempo** (already in Stanza; extended with cached analysis bundle).
   - **Suggest sections** — run shared section detector; user confirms before inserting markers.
   - **Versioned analysis cache** on local uploads (`analysisCache` on `StanzaSong`, device-local, not in Drive envelope).

3. **Shared code promotion** — Beat-only modules Stanza needs (section detection, measure helpers, analysis bundle types) move to `src/shared/beat/**`. Beat keeps thin re-export shims until the route is retired.

4. **Data migration** — One-time import from `beat-finder-library` IndexedDB into Stanza Dexie: match by fingerprint / `youtube:{id}`, map practice sections → markers, map `PerSongSettings` → Stanza metronome/mix fields.

5. **Not in scope for this ADR** — Chord/key hover UI, fermata-aware metronome playback, Beat lane timeline UI, separate Beat library shell.

## Field mapping (Beat → Stanza)

| Beat (`PerSongSettings` / lanes)   | Stanza (`StanzaSong`)                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `bpm` / manual override            | `metronomeSongCalibration.bpm`                                                                                                  |
| `syncStartTime`                    | `metronomeSongCalibration.anchorMediaTime` / `firstBeatOffsetSec`                                                               |
| `playbackRate`                     | (future: playback rate pref if added)                                                                                           |
| `metronomeEnabled`, volumes, mutes | `metronomeEnabled`, `metronomeGain`, `metronomeMuted`, `drumsEnabled`, `drumsGain`, `drumsMuted`, `primaryGain`, `primaryMuted` |
| `transposeSemitones`               | `localTransposeSemitones`                                                                                                       |
| Practice lane section boundaries   | `markers[]` (`time`, `label`)                                                                                                   |
| Cached `PersistedAnalysisBundle`   | `analysisCache` (local-only)                                                                                                    |

## Consequences

- Beat `App.tsx` and library UI stop receiving feature work; CI keeps `src/beat/**` benchmarks as the tempo regression harness until fully relocated.
- Stanza gains `analysisCache`, suggest-sections UI, and import utility; Drive merge must omit local-only analysis blobs (same pattern as `localAudioBlob`).
- Users with Beat libraries see a non-blocking import toast on first Stanza load after upgrade.
- Import boundaries unchanged: `src/stanza/**` must not import `src/beat/**`.

## Alternatives considered

- **Long parallel run of both apps** — rejected; duplicates persistence bugs and splits user data.
- **Replace Stanza markers with Beat lane model** — rejected; conflicts with ADR 0008 stable segment ids and manual-first UX.

## Links

- [`src/stanza/README.md`](../../src/stanza/README.md)
- [`src/beat/README.md`](../../src/beat/README.md)
- [`src/shared/beat/findTheBeatAnalyzer.ts`](../../src/shared/beat/findTheBeatAnalyzer.ts)
- [`src/stanza/import/beatLibraryImport.ts`](../../src/stanza/import/beatLibraryImport.ts)
