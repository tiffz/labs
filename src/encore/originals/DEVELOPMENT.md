# Encore Originals — development notes

App overview and Drive/sync: [`README.md`](../README.md), [ADR 0012](../../docs/adr/0012-encore-originals-local-first-domain.md).

Chord chart **data model and import**: [`src/shared/music/chordPro/chordChartLayout.ts`](../../shared/music/chordPro/chordChartLayout.ts), fixtures in [`chordPro/fixtures.ts`](../../shared/music/chordPro/fixtures.ts), paste tests in [`pastedChartImport.test.ts`](../../shared/music/chordPro/pastedChartImport.test.ts).

## Chord paint editor (Chords stage)

Entry: `OriginalSongPage` keeps `OriginalsSongHeader` at page level for most write stages. **Add chords** uses Encore shell `height: 100dvh` + a page `.in-scroll-region` so the title and stepper scroll away. `OriginalsSongWorkspace` sets `display: contents` (`integratedPageScroll`) so the stepper band, `.in-scroll-region__sticky-surface` (playback + palette), and chart are **direct scroll children**. **Palette gestalt**: `.encore-originals-chord-palette-pick` groups preset chips + Custom segment + Clear (same task: arm a chord); `.encore-originals-chord-palette-display` is separated by a vertical rule with a “Show” label for the A–G / I–V notation toggle (view preference, not chord selection). **Chord playback**: `OriginalChordPlayback` uses shared `useChartChordPlayback` + `ChordPlaybackSettingsPanel` (styled voicings via `getChordHitsForStyle`, instruments via `createInstrumentForSoundType`, optional drums via `scheduleDrumMeasure`). Settings persist in `sessionStorage` under `encore-originals-chord-playback-settings`. **Demo takes** (view + write): `EncoreStaticResourceHoverCard` exposes nickname, notes, play, and download via `encoreResourceDownload`.

State hook: [`hooks/useOriginalsChartLayout.ts`](hooks/useOriginalsChartLayout.ts). Interaction types: [`chartInteractionTypes.ts`](chartInteractionTypes.ts).

### Interaction state machine

| Mode               | How you enter                                          | Next action                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Armed chord**    | Pick a palette chip (or custom + Enter)                | Click a lyric **word** → stamps chord (`onStamp` + `upsertChordAtIndex`)                                                                                                       |
| **Selected word**  | Click a lyric word (no chord armed)                    | Pick a palette chip → places on that word (`onPlaceChord`)                                                                                                                     |
| **Selected chord** | Click a chord badge                                    | Pick palette chip → **replace** (`onSwapChord`); click another word on the **same line** → **move** (`onStamp` + `moveChordById`); Delete/Backspace → remove (`onRemoveChord`) |
| **Clear**          | Clear control, Escape, or click outside paint surfaces | —                                                                                                                                                                              |

Click-outside uses `document` `pointerdown`. Targets inside palette, toolbar, playback, chord badges, or lyric tokens are ignored. See [`src/shared/dom/resolveEventTargetElement.ts`](../../shared/dom/resolveEventTargetElement.ts) and `STYLE_GUIDE.md` (document-level dismiss handlers).

### Identity rules

- **`ChordMarker.id`** — selection, move, swap, delete (toggle select by `chordId`).
- **`ChordMarker.charIndex`** — placement on the lyric string only; **multiple chords per word are normal** (paste import, outro, etc.).
- **Move** — same `sectionId` + `lineId` only; compare **word starts** via `snapChordColumnToCharIndex`, not raw indices (see hook `onStamp`).

### Layout / import contract

- Paint aligns chords to **word token starts** (`tokenizeLyricLine`, `groupChordsByTokenStart`).
- Pasted monospace charts snap columns with `snapChordColumnToCharIndex` / `assignChordCharIndicesFromColumns`.
- Regression anchor: `MEET_ME_MOON_PASTE` and `MEET_ME_AROUND_LYRIC` in [`chordPro/fixtures.ts`](../../shared/music/chordPro/fixtures.ts).

### Known API gap

- **`upsertChordAtIndex`** removes **all** chords at that index, then adds one. Use only when replacing the whole word slot. Per-chord edits use `replaceChordById` / `removeChordById` / `moveChordById`. A future `addChordAtIndex` would append without clearing siblings.

## Verification (chord paint / chordPro)

Full gate: `npm run presubmit`.

Focused subset while iterating on paint or `chordPro`:

```bash
npm run typecheck
npx eslint src/encore/originals src/shared/music/chordPro src/shared/dom
npx vitest run src/shared/music/chordPro src/shared/dom src/encore/originals
```

Repo-wide Knip may still report unrelated unused exports; fix any new ones you introduce.

## Tests map

| Area                        | File                                             |
| --------------------------- | ------------------------------------------------ |
| Layout / move / multi-chord | `chordChartLayout.test.ts`                       |
| Paste import                | `pastedChartImport.test.ts`                      |
| Paint hook                  | `hooks/useOriginalsChartLayout.test.ts`          |
| Click-outside / Text nodes  | `components/OriginalsPaintChordsEditor.test.tsx` |
| DOM helper                  | `shared/dom/resolveEventTargetElement.test.ts`   |
| E2E smoke                   | `e2e/encore-originals-chord-paint.spec.ts`       |
