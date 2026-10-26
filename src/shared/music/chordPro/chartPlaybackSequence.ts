import { parseChordSymbol } from '../chordMatcher';
import { tokenizeLyricLine, snapChordColumnToCharIndex, type ChartLayout, type ChordMarker, type LyricLine } from './chordChartLayout';

/** Assume 4/4: a lyric line spans at least two measures; one chord change per measure. */
export const CHART_PLAYBACK_MEASURES_PER_LINE = 2;
export const CHART_PLAYBACK_BEATS_PER_MEASURE = 4;

/**
 * Word count above which a lyrics-only line (no playable chords) is estimated at two
 * measures instead of one — so a song with lyrics but no chords still gets a realistic
 * duration from its line breakdown + tempo, not one flat measure per line.
 */
export const LYRIC_ONLY_TWO_MEASURE_WORD_THRESHOLD = 6;

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

/** The words sung in measure `measureIndex` of `measureCount`, split as evenly as the words allow. */
function lyricSpanForMeasure(
  text: string,
  measureIndex: number,
  measureCount: number,
): { start: number; end: number } {
  const words = wordTokens(text);
  if (words.length === 0) return { start: 0, end: 0 };
  const per = Math.ceil(words.length / measureCount);
  const slice = words.slice(measureIndex * per, (measureIndex + 1) * per);
  const group = slice.length > 0 ? slice : words.slice(-1);
  return { start: group[0]!.start, end: group[group.length - 1]!.end };
}

/**
 * How many measures a line spans in playback.
 *
 * A chord-only line (an intro, a solo, an instrumental) is a chord chart: one measure per chord.
 * A lyric line spans two measures, or one per chord when it has more than two. Before this, every
 * line was two measures holding at most `chords[0]` and `chords[1]`, so `[Am][F][C][G]` played
 * `Am F` and C and G were silently dropped.
 */
export function playbackMeasuresForLine(line: LyricLine): number {
  if (line.text.trim().length === 0) return line.chords.length;
  return Math.max(CHART_PLAYBACK_MEASURES_PER_LINE, line.chords.length);
}

function lineHasPlaybackContent(line: LyricLine): boolean {
  return line.text.trim().length > 0 || line.chords.length > 0;
}

/**
 * Build a measure-aligned playback schedule: {@link playbackMeasuresForLine} measures per line, one
 * chord per measure in order, holding the last chord when a line has fewer chords than measures.
 */
export function chartLayoutToPlaybackSequence(layout: ChartLayout): ChartPlaybackStep[] {
  const steps: ChartPlaybackStep[] = [];
  let carry: ChordMarker | null = null;
  let tickCounter = 0;

  for (const section of layout.sections) {
    for (const line of section.lines) {
      if (!lineHasPlaybackContent(line)) continue;

      const chords = [...line.chords].sort((a, b) => a.charIndex - b.charIndex);
      const measureCount = playbackMeasuresForLine(line);

      for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
        // Each chord in order; past the last, hold it; a line with none holds the previous line's.
        const active: ChordMarker | null = chords[measureIndex] ?? chords[chords.length - 1] ?? carry;
        if (!active) continue;

        carry = active;
        const { start, end } = lyricSpanForMeasure(line.text, measureIndex, measureCount);

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
  const safeTempo = Number.isFinite(tempo) && tempo > 0 ? tempo : 80;
  const beatMs = 60_000 / safeTempo;
  return beatMs * CHART_PLAYBACK_BEATS_PER_MEASURE;
}

/** Playback steps with parseable chord symbols — matches `useChartChordPlayback`. */
export function chartLayoutToPlayablePlaybackSteps(layout: ChartLayout): ChartPlaybackStep[] {
  return chartLayoutToPlaybackSequence(layout).filter((step) => parseChordSymbol(step.chordName));
}

/** Playable steps for one section — used by section loop playback. */
export function chartLayoutSectionPlayableSteps(
  layout: ChartLayout,
  sectionId: string,
): ChartPlaybackStep[] {
  return chartLayoutToPlayablePlaybackSteps(layout).filter((step) => step.sectionId === sectionId);
}

export function sectionHasPlayableChartSteps(layout: ChartLayout, sectionId: string): boolean {
  return chartLayoutSectionPlayableSteps(layout, sectionId).length > 0;
}

function distinctChordAnchors(line: LyricLine): number {
  const anchors = new Set(
    line.chords.map((c) => snapChordColumnToCharIndex(c.charIndex, line.text)),
  );
  return anchors.size;
}

function lineHasPlayableChords(line: LyricLine): boolean {
  return line.chords.some((c) => parseChordSymbol(c.chordName));
}

/**
 * Heuristic measure count for duration display (not necessarily identical to paint playback).
 * Short / chord-only lines often get one measure in real performance; longer lines with two
 * chord changes use two.
 */
export function estimateMeasuresForLine(line: LyricLine): number {
  if (!lineHasPlaybackContent(line)) return 0;
  const hasChordMarkers = line.chords.length > 0;
  const playable = lineHasPlayableChords(line);
  if (hasChordMarkers && !playable) return 0;
  const words = wordTokens(line.text);
  const anchors = distinctChordAnchors(line);
  // A chord-only line plays one measure per chord; estimate the same so the duration matches.
  if (words.length === 0) return playbackMeasuresForLine(line);
  if (anchors > CHART_PLAYBACK_MEASURES_PER_LINE) return playbackMeasuresForLine(line);
  if (words.length <= 4) return 1;
  if (anchors >= 2) return CHART_PLAYBACK_MEASURES_PER_LINE;
  // No two-chord signal to widen the line. Chord charts keep single-chord lines at one
  // measure; a lyrics-only line (no playable chords) instead widens by length, so a
  // song without chords still estimates from its lyric-line breakdown, not 1 flat
  // measure per line.
  if (!playable && words.length > LYRIC_ONLY_TWO_MEASURE_WORD_THRESHOLD) {
    return CHART_PLAYBACK_MEASURES_PER_LINE;
  }
  return 1;
}

/** Total measures for duration estimate at the given layout. */
export function estimateChartPlaybackMeasureCount(layout: ChartLayout): number {
  let measures = 0;
  for (const section of layout.sections) {
    for (const line of section.lines) {
      measures += estimateMeasuresForLine(line);
    }
  }
  return measures;
}

/** Total chord-playback duration in ms at the given tempo. */
export function estimateChartPlaybackDurationMs(layout: ChartLayout, tempo: number): number {
  const measureCount = estimateChartPlaybackMeasureCount(layout);
  if (measureCount === 0 || tempo <= 0) return 0;
  return measureCount * chartPlaybackMeasureDurationMs(tempo);
}

/** Format playback duration as `m:ss` (rounded to whole seconds). */
export function formatChartPlaybackDuration(durationMs: number): string {
  const wholeSeconds = Math.round(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(wholeSeconds / 60);
  const remaining = wholeSeconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}
