# Find the Beat → Stanza migration

One-time import from the legacy `beat-finder-library` IndexedDB into Stanza Dexie. Implementation: [`beatLibraryImport.ts`](./beatLibraryImport.ts). Product context: [ADR 0013](../../../docs/adr/0013-stanza-subsumes-find-the-beat.md).

## Why migrated songs can feel different

Stanza is **not** a pixel-perfect emulator of Find the Beat. Migration copies what maps cleanly onto Stanza’s manual-first model. Several Beat features were intentionally dropped or only partially translated.

### 1. Different product model (by design)

| Find the Beat                                                 | Stanza                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| Analysis-first: auto BPM, chord chart, spectral sections      | Manual-first: markers, tap tempo, optional **Analyze** |
| Lane-based practice editor (multiple parallel section tracks) | Single marker timeline (stable segment ids, ADR 0008)  |
| Chord/key hover chart                                         | Key field + optional detect on **local uploads only**  |
| YouTube: manual BPM + analysis hints                          | YouTube: no Essentia analysis; tempo tools limited     |

Even with perfect field mapping, workflow and defaults differ.

### 2. Data that is not migrated

| Beat data                           | Stanza                 | Notes                                                                                              |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| Practice **lanes**                  | —                      | All lane sections are flattened into one marker list; lane names and per-lane layouts are lost.    |
| Per-section / per-lane BPM          | `metronomeBySegmentId` | Only whole-song `metronomeSongCalibration` is imported. Re-calibrate sections in Stanza if needed. |
| `playbackRate`                      | —                      | Stanza does not persist playback speed on the song row (session-only today).                       |
| `loopRegion` / `loopEnabled`        | Loop mode chips        | Beat loop regions are not restored; use Stanza’s play-once / loop-all / loop-selection.            |
| `alignLoopToMetronome`, `nudgeUnit` | —                      | Beat-specific loop UX.                                                                             |
| Chord chart / hover analysis        | —                      | Out of scope for ADR 0013.                                                                         |
| Fermata-aware metronome playback    | Steady click grid      | Shared analyzer data may exist in `analysisCache`, but playback behavior differs.                  |

### 3. Partial mapping (works but not identical)

**Section boundaries** — Beat practice sections become **marker times at section starts** only (`beatPracticeSectionsToStanzaMarkers`). End times and lane grouping are not preserved as separate fields; segments are derived from markers + duration.

**Metronome sync** — Beat `syncStartTime` and analysis `musicStartTime` + `offset` map to Stanza `metronomeSongCalibration.firstBeatOffsetSec`. Beat treated some of these as “music trim”; Stanza treats them as **Beat 1 anchor** for the click grid. Re-check calibration with **Tap tempo** or **Analyze** if clicks feel early/late.

**Mix levels** — Beat volumes were 0–100; Stanza stores linear 0–1 gains. Rounding is negligible but mute/enabled defaults may differ (see below).

**Fingerprints** — Beat used SHA256 file hashes; Stanza uses `size:duration:filename`. Migration upgrades fingerprints and keeps a Beat→Stanza id map so old `?f=` links still resolve.

**Analysis cache** — Bundles copy to device-local `analysisCache`. Stale versions are marked stale; Stanza never silently re-runs analysis on open.

### 4. Merge rules (if you already had the song in Stanza)

When a Beat row matches an existing Stanza song (same YouTube id, fingerprint, or migration id):

- **Existing markers win** — Beat section markers are **not** merged if Stanza already has markers.
- **Existing metronome calibration wins** — Beat BPM/sync does not overwrite `metronomeSongCalibration`.
- **Missing blobs / analysis** — Beat file blob or `analysisCache` may still fill gaps.

If you practiced the same piece in both apps, Stanza-side edits take precedence.

### 5. YouTube-specific gaps

Beat allowed saving manual BPM and metronome settings for YouTube. Stanza still plays YouTube, but **Analyze**, key detect, and pitch shift require a **local upload**. Migrated YouTube rows keep metronome/mix settings; they do not gain analysis features without uploading the audio.

### 6. Upgrade pass (v3 migration state)

On each load, `upgradeLegacyBeatImportedSongs()` may fix older partial imports:

- Stanza-style fingerprints + Beat SHA256 map for `?f=` URLs
- Marker ids (no more `beat-import-*`)
- Inferred `ytId` from legacy Beat titles
- Metronome calibration inferred from `analysisCache` when missing
- Metronome toggled **off** when enabled but unc calibrated (Beat default vs Stanza expectation)

State key: `stanza:beat-library-migration-v3` in `localStorage`.

## What to do if something feels wrong

1. Open the song → check **sections** (markers) and **Practice** rail metronome calibration.
2. For local files: run **Analyze** or **Tap tempo**; use **Suggest sections** if boundaries are missing.
3. For YouTube: upload the same recording locally if you need analysis/key/pitch tools.
4. If mix or BPM look wrong after a **merge**, adjust in Stanza — Beat values may have lost to an existing Stanza row.

## Related

- [`BOOTSTRAP.md`](../BOOTSTRAP.md) — when import runs
- [`beatLibraryImport.test.ts`](./beatLibraryImport.test.ts) — mapping tests
- [ADR 0013](../../../docs/adr/0013-stanza-subsumes-find-the-beat.md) — field mapping table
