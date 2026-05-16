# ADR 0009: Stanza drums groove and metronome volume

## Status

Accepted.

## Context

The Stanza practice rail had two related gaps that surfaced during a senior-engineering review:

1. The metronome click was hard-coded at a quiet ceiling (`base = 0.52` in
   `useStanzaMetronomeSync`), with **no user-facing volume control or mute**. People practicing
   against backing tracks reported it being inaudible.
2. There was no **drum groove** option. Other Labs apps (Beat Finder) offer "Add drums" patterns
   based on the shared rhythm preset library. Vocalists practicing with Stanza wanted the same
   so they could rehearse phrasing against an actual beat.

Both belong inside the same physical region of the UI — the right rail above the Mix — so we
added them together along with a small condensation pass to keep the rail compact.

## Decision

### 1. Metronome volume is a 0–1 multiplier on the engine ceiling

`StanzaSong` now carries `metronomeGain?: number` (default `1.0`) and `metronomeMuted?: boolean`.
The engine's downbeat ceiling moves from `0.52` → `0.85`; the user gain multiplies it. Off-beat
ratio (`0.42`) and downbeat playback rate (`1.28`) are preserved so the timbre is unchanged.

`useStanzaMetronomeSync` reads `gain` and `muted` through refs so the Mix slider reacts in real
time without resetting the beat tracker. `muted` short-circuits the click but leaves the rAF
loop running so the strip's beat indicators continue updating with playback.

### 2. Drums reuse the shared `DrumAccompaniment` (Beat Finder UX)

The Beat Finder app already ships an "Add drums" affordance built on the shared
`src/shared/components/music/DrumAccompaniment` component:

- A `Checkbox` labelled **Add drums**.
- When enabled, `DrumAccompaniment` renders the preset row, the editable mini-notation input,
  and the `DrumNotationMini` renderer with playhead highlighting.
- `DrumAccompaniment` plays its own audio (via the shared `AudioPlayer`) reactively against a
  caller-supplied `currentBeatTime`, `currentBeat`, and `isPlaying`.

Stanza adopts the same component, wired to the metronome's resolved bpm + anchor:

| `DrumAccompaniment` prop | Stanza source                                                                |
| ------------------------ | ---------------------------------------------------------------------------- |
| `bpm`                    | `metronomeSyncSource.bpm` (fallback `120` while uncalibrated, for preview)   |
| `timeSignature`          | `{ numerator: 4, denominator: 4 }` (Stanza doesn't track per-song time sig)  |
| `isPlaying`              | `selected.drumsEnabled && playback.isPlaying && drumsHasGrid`                |
| `currentBeatTime`        | `Math.max(0, playback.currentTime − metronomeSyncSource.anchor)`             |
| `currentBeat`            | `floor(currentBeatTime × bpm / 60)`                                          |
| `metronomeEnabled`       | `selected.metronomeEnabled` (toggles dot overlay in `DrumNotationMini`)      |
| `volume`                 | `Math.round(drumsUserGain × 100)` (component takes 0–100; Stanza stores 0–1) |

When the metronome isn't calibrated yet (`drumsHasGrid === false`), the component renders so the
user can browse / edit a pattern, but `isPlaying` stays false and a one-line caption says
"Set BPM and Beat 1 above to start the drum loop." This avoids drum hits firing without a real
Beat 1 to align to.

### 3. Persisted state is just two booleans/numbers

`StanzaSong` carries:

- `drumsEnabled?: boolean` — the "Add drums" checkbox state.
- `drumsGain?: number` — 0–1 (default `0.7`). Drives the **Drums** Mix row slider.

We deliberately **do not** persist:

- The selected preset / custom mini-notation: matches the Beat Finder UX, where pattern choice
  is per-session. Reopening a song reopens with the default preset; users can save common
  patterns by other means (the mini-notation input accepts pasted Darbuka Trainer URLs).
- A drums mute toggle: the **Add drums** checkbox is the on/off; the Mix slider can be dragged
  to zero. A separate mute icon would just duplicate one of those.
- Per-section drum overrides: out of scope for v1. If a user wants different drums in different
  sections, they can disable drums and use only the metronome there. We can revisit per-section
  overrides if practice journeys reveal real demand; the schema can be extended without breaking
  changes.

### 4. UI: one rail block + one Mix row, paid for by a focused condensation pass

- **`Add drums` checkbox + `DrumAccompaniment`** sit below the metronome rail in
  `StanzaWorkspace`. The checkbox is always visible; the panel renders only when checked.
- **Mix row** for Drums sits above the existing Main + stem rows when drums are enabled. It
  uses `AppLinearVolumeSlider` with no mute icon (the **Add drums** checkbox is the on/off).
  The Metronome Mix row sits next to it, always visible — that one keeps a mute icon because
  it parallels the Main row's mute affordance.
- **Condensation** to absorb the new rail height without losing breathing room:
  - Boundary misalignment `Alert` was replaced with an inline warning icon + Snap `IconButton`
    next to the BPM row. The longer-form copy still appears in the timeline hover card.
  - "Set BPM" `Alert` above the metronome strip was demoted to an inline strip placeholder
    (`Metronome — set BPM below ↓`) plus an updated tooltip on the strip toggle.
  - "Section overrides whole-song tempo" `Alert` collapsed to an `InfoOutlined` icon next to the
    section name in the rail header, with the explanation in a tooltip.
  - The "Calibrate for X" header + the `This section / Whole song` flip button merged into one
    row using a `Section / Song` `ToggleButtonGroup`.
  - "+ Add layer" moved from a full-width row at the bottom of Mix to an `Add` `IconButton` in
    the Mix header.
  - Stem row `minHeight` 36 → 32, Mix `Stack spacing` 0.75 → 0.6.

### 5. Drive backup carries the new fields

`StanzaSongDriveRow` is `Omit<StanzaSong, 'localAudioBlob' | 'stems'> & { stems?: ... }`, so the
new fields automatically appear in the envelope shape. `stanzaSongFromDriveRow` and
`mergeOneSong` were extended to thread `metronomeGain`, `metronomeMuted`, `drumsEnabled`, and
`drumsGain` through. Drum sample blobs are not stored — playback uses bundled assets — so the
round trip is metadata only.

## Consequences

- The metronome is now louder by default and user-controllable, including from YouTube-only
  songs (which previously had no Mix block at all).
- The drums UI is identical to Beat Finder's, so users don't have a second mental model. Bug
  fixes / polish to `DrumAccompaniment` improve both apps.
- Reusing `DrumAccompaniment` means no new RAF audio engine in the Stanza tree — the component
  schedules its own hits reactively against the `currentBeatTime` we feed from the playback
  state. Precision is comparable to Beat Finder's drum playback (≤ 1 frame jitter).
- Per-section overrides are unsupported. If we add them later, the resolver + UI would need to
  handle:
  - which section is currently under the playhead;
  - inheritance fallback to a global pattern;
  - explicit "mute drums in this section" via a sentinel value.
    None of that exists today; the schema simply has no per-section drum field.
- Pattern choice is per-session. If users want this persisted, we'd add `drumsPatternId` /
  `drumsCustomNotation` to `StanzaSong` and a small wrapper around `DrumAccompaniment` that
  notifies the workspace on selection. Listing the additive change here so a future PR can
  resurrect the persistence with a one-line schema bump.

## Alternatives considered

- **Local custom Stanza drums RAF + pattern picker UI**: implemented in an earlier draft and
  reverted in favor of `DrumAccompaniment`. Trade-off: the local engine was more precise (it
  walked a slot table per RAF tick) but introduced a parallel UX that didn't match Beat Finder's
  established surface. User feedback: copy Beat Finder, simplify.
- **Per-section pattern overrides**: deferred per user request to ship v1 simple. Schema slot
  exists in commit history if we want to revive it.
- **Global drums mute toggle in the Mix**: rejected — the **Add drums** checkbox already serves
  as on/off; the Mix slider going to zero is the volume-only mute. A second mute icon would be
  a third way to do the same thing.

## Links

- [`src/stanza/db/stanzaDb.ts`](../../src/stanza/db/stanzaDb.ts) — schema additions.
- [`src/stanza/hooks/useStanzaMetronomeSync.ts`](../../src/stanza/hooks/useStanzaMetronomeSync.ts) — gain + mute integration.
- [`src/stanza/components/StanzaWorkspace.tsx`](../../src/stanza/components/StanzaWorkspace.tsx) — wires the checkbox + `DrumAccompaniment` + Mix rows.
- [`src/shared/components/music/DrumAccompaniment.tsx`](../../src/shared/components/music/DrumAccompaniment.tsx) — shared drum UI / playback (also used by Beat Finder).
- [`src/stanza/drive/stanzaDriveMerge.ts`](../../src/stanza/drive/stanzaDriveMerge.ts) — Drive round-trip.
- ADR [0008](./0008-stanza-section-marker-model-and-metronome-calibration.md) — segment id model + per-section calibration this builds on (drums consume the _resolved_ bpm + anchor only).
- ADR [0005](./0005-shared-find-the-beat-analyzer.md) — analyzer that feeds the metronome BPM the drums then inherit.
