# Stanza copy style

Stanza follows the default Labs voice in
[`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md). This file documents
the terminology and patterns specific to Stanza so future copy stays consistent
across the timeline, mix rail, metronome, and dialogs.

## Canonical terminology

Pick one word per concept and use it everywhere.

| Concept                                             | Use in UI                 | Avoid                                                       |
| --------------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| User-defined ranges between markers                 | **Section**               | "segment" (kept for code-level identifiers only)            |
| The act of adding a marker at the playhead          | **Split at playhead**     | "Add marker" (we surface the verb, not the noun)            |
| Removing a marker that joins this section into prev | **Join with previous**    | "Merge sections", "Delete marker"                           |
| Move a marker to the nearest beat on the BPM grid   | **Snap to beat**          | "Align to beat", "Quantize boundaries"                      |
| Extra audio files mixed in alongside the main track | **Mix layer** / **layer** | "Stem" (kept for code-level types like `StanzaStemTrack`)   |
| Combined level area                                 | **Mix**                   | "Stems", "Tracks"                                           |
| Setting BPM and Beat 1 for the click                | **Calibrate**             | "Tune"                                                      |
| Tempo number                                        | **BPM**                   | "Tempo" alone (use both: "tempo (BPM)" if context unclear)  |
| Phase reference for the click                       | **Beat 1**                | "Downbeat" (in copy; technical comments may use "downbeat") |
| Non-loop transport mode                             | **Play through**          | "Loop off" alone                                            |
| Pink-tinted UI region around the loop selection     | **Selection span**        | "Pink area", "pink span"                                    |
| Push outer section markers to match the selection   | **Resize to selection**   | "Commit boundaries", "Apply selection", "Pad or nudge"      |
| Per-section opt-out from forward playback           | **Skip during playback**  | "Mute section", "Bypass", "Disable"                         |
| Toggle a drum groove on/off                         | **Add drums**             | "Enable drums", "Drum machine", "Beat"                      |
| Drum rhythm choice from the shared preset library   | **Pattern**               | "Groove preset", "Rhythm template"                          |
| Mix slider for the click track                      | **Metronome** (Mix row)   | "Click", "Tick"                                             |
| Mix slider for the drum groove                      | **Drums** (Mix row)       | "Beat", "Percussion"                                        |

Internal types (`StanzaStemTrack`, `DerivedSegment`, etc.) keep technical names
even though the UI says "layer" / "section". The boundary between code and copy
is intentional: `stem` is the audio-engineering term that makes sense in code;
`layer` is the welcoming everyday word that fits the practice-tool surface.

## Tone reminders

- **No em dashes in user-visible strings.** Use a period, comma, or a second
  short sentence. (Em dashes are fine in code comments.)
- **Aria labels match what's on screen.** When a tooltip carries a dynamic
  "why this is disabled" message, push the same string to `aria-label` so
  screen-reader users hear the same explanation. Pattern in
  `StanzaTimeline` for the "commit selection to boundaries" icon.
- **Section labels read as nouns.** When auto-generated, default to
  `Section <N>` (1-indexed). User-renamed labels can be anything; we never
  re-derive them.
- **Errors recover the user, not blame them.** "Couldn't detect tempo. Try
  again, or set BPM manually." beats "Analysis failed."

## Tooltip discipline

- One short sentence is enough for icon buttons. Two short sentences if there's
  a meaningful "what" + "when".
- Don't reference DAWs by name unless absolutely necessary (we removed a "same
  idea as Logic Pro" reference for being insider-y).
- The big timeline `(i)` tooltip (`BAR_HELP` in `StanzaTimeline.tsx`) is the
  one exception — it's a short overview. Keep it under three sentences and
  don't grow it into a manual.
