import { tokenizeLyricLine, type ChartLayout, type ChordMarker, type LyricLine } from './chordChartLayout';

/** Assume 4/4: each lyric line spans two measures; one chord change per measure. */
export const CHART_PLAYBACK_MEASURES_PER_LINE = 2;
export const CHART_PLAYBACK_BEATS_PER_MEASURE = 4;

export type ChartPlaybackStep = {
  tickId: string;
  sectionId: string;
  lineId: string;
  /** Chord marker id (may repeat when holding a chord across a measure). */
  markerId: string;
  charIndex: number;
  chordName: string;
  measureIndex: number;
  /** Half-open lyric span being sung this measure. */
  lyricHighlightStart: number;
  lyricHighlightEnd: number;
};

function wordTokens(text: string): Array<{ start: number; end: number }> {
  return tokenizeLyricLine(text)
    .filter((t) => !/^\s+$/.test(t.token))
    .map((t) => ({ start: t.start, end: t.start + t.token.length }));
}

function lyricSpanForMeasure(text: string, measureIndex: number): { start: number; end: number } {
  const words = wordTokens(text);
  if (words.length === 0) return { start: 0, end: 0 };
  const mid = Math.ceil(words.length / 2);
  const slice = measureIndex === 0 ? words.slice(0, mid) : words.slice(mid);
  const group = slice.length > 0 ? slice : words;
  return { start: group[0]!.start, end: group[group.length - 1]!.end };
}

function chordForMeasure(chords: ChordMarker[], measureIndex: number, carryChord: ChordMarker | null): ChordMarker | null {
  if (measureIndex === 0) return chords[0] ?? carryChord;
  return chords[1] ?? chords[0] ?? carryChord;
}

function lineHasPlaybackContent(line: LyricLine): boolean {
  return line.text.trim().length > 0 || line.chords.length > 0;
}

/**
 * Build a measure-aligned playback schedule: two measures per lyric line, chord at each
 * measure boundary, holding/repeating the previous chord when a line has fewer changes.
 */
export function chartLayoutToPlaybackSequence(layout: ChartLayout): ChartPlaybackStep[] {
  const steps: ChartPlaybackStep[] = [];
  let carry: ChordMarker | null = null;
  let tickCounter = 0;

  for (const section of layout.sections) {
    for (const line of section.lines) {
      if (!lineHasPlaybackContent(line)) continue;

      const chords = [...line.chords].sort((a, b) => a.charIndex - b.charIndex);

      for (let measureIndex = 0; measureIndex < CHART_PLAYBACK_MEASURES_PER_LINE; measureIndex += 1) {
        const active = chordForMeasure(chords, measureIndex, carry);
        if (!active) continue;

        carry = active;
        const { start, end } = lyricSpanForMeasure(line.text, measureIndex);

        steps.push({
          tickId: `tick-${tickCounter++}`,
          sectionId: section.sectionId,
          lineId: line.lineId,
          markerId: active.id,
          charIndex: active.charIndex,
          chordName: active.chordName,
          measureIndex,
          lyricHighlightStart: start,
          lyricHighlightEnd: end,
        });
      }
    }
  }

  return steps;
}

/** One measure duration in ms at the given tempo (4/4). */
export function chartPlaybackMeasureDurationMs(tempo: number): number {
  const beatMs = 60_000 / tempo;
  return beatMs * CHART_PLAYBACK_BEATS_PER_MEASURE;
}
