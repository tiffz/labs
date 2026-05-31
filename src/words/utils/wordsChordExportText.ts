import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { Key } from '../../shared/music/chordTypes';
import type { SyllableHit } from './prosodyEngine';
import type { EffectiveSection, SectionRenderPlan } from './wordsSectionPlans';

function toLyricWords(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function alignChordsOverLine(lyricLine: string, chordTokens: string[]): string {
  if (chordTokens.length === 0) return '';
  const starts = Array.from(lyricLine.matchAll(/\S+/g)).map(
    (match) => match.index ?? 0
  );
  const slotCount = chordTokens.length;
  const anchors =
    starts.length > 0
      ? Array.from({ length: slotCount }, (_, slot) => {
          const ratio = slotCount === 1 ? 0 : slot / (slotCount - 1);
          const mapped = Math.floor(ratio * (starts.length - 1));
          return starts[Math.max(0, Math.min(starts.length - 1, mapped))];
        })
      : Array.from({ length: slotCount }, (_, slot) => slot * 4);
  const minimumChordWidth =
    chordTokens.reduce((sum, token) => sum + token.length + 2, 0) + 2;
  const buffer = Array.from({
    length: Math.max(lyricLine.length + 24, minimumChordWidth),
  }).fill(' ');
  let minStart = 0;
  anchors.forEach((anchor, tokenIndex) => {
    const token = chordTokens[tokenIndex] ?? '';
    if (!token) return;
    const start = Math.max(anchor, minStart);
    for (let offset = 0; offset < token.length; offset += 1) {
      const at = start + offset;
      if (at >= buffer.length) buffer.push(token[offset]);
      else buffer[at] = token[offset] ?? ' ';
    }
    minStart = start + token.length + 2;
  });
  return buffer.join('').trimEnd();
}

function formatRemainingMeasureChords(chords: string[]): string[] {
  if (chords.length === 0) return [];
  const lines: string[] = [];
  for (let index = 0; index < chords.length; index += 4) {
    const chunk = chords.slice(index, index + 4);
    lines.push(chunk.join('  '));
  }
  return lines;
}

export function buildLyricsExportText(
  effectiveSections: EffectiveSection[],
  sectionDisplayNames: string[]
): string {
  return effectiveSections
    .map((section, index) => {
      const heading = sectionDisplayNames[index] ?? `Section ${index + 1}`;
      return `${heading}\n${section.effectiveLyrics || ''}`.trim();
    })
    .join('\n\n');
}

export function buildAsciiChordChartExportText(
  effectiveSections: EffectiveSection[],
  sectionDisplayNames: string[],
  sectionRenderPlans: SectionRenderPlan[],
  chordLabelsByMeasure: Map<number, string>,
  songKey: Key,
  sixteenthsPerMeasure: number
): string {
  return effectiveSections
    .map((section, index) => {
      const heading = sectionDisplayNames[index] ?? `Section ${index + 1}`;
      const plan = sectionRenderPlans[index];
      const chordSymbolsByMeasure = plan
        ? Array.from({ length: plan.totalMeasureCount }, (_, offset) => {
            return (
              chordLabelsByMeasure.get(plan.startMeasure + offset) ?? songKey
            );
          })
        : [];
      const lyricLines = (section.effectiveLyrics || '')
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0);
      if (lyricLines.length === 0) {
        const fallback =
          chordSymbolsByMeasure.length > 0
            ? formatRemainingMeasureChords(chordSymbolsByMeasure).join('\n')
            : '(no chord progression)';
        return `${heading}\n${fallback}`;
      }
      const wordIndexToLine = new Map<number, number>();
      let globalWordIndex = 0;
      lyricLines.forEach((line, lineIndex) => {
        const words = toLyricWords(line);
        words.forEach(() => {
          wordIndexToLine.set(globalWordIndex, lineIndex);
          globalWordIndex += 1;
        });
      });
      const measureOffsetsByLine = lyricLines.map(() => new Set<number>());
      if (plan) {
        plan.result.hits.forEach((hit) => {
          const lineIndex = wordIndexToLine.get(hit.wordIndex);
          if (lineIndex === undefined) return;
          const measureOffset = Math.floor(
            hit.startSixteenth / sixteenthsPerMeasure
          );
          if (
            measureOffset >= 0 &&
            measureOffset < chordSymbolsByMeasure.length
          ) {
            measureOffsetsByLine[lineIndex]?.add(measureOffset);
          }
        });
      }
      const usedMeasureOffsets = new Set<number>();
      let fallbackMeasureCursor = 0;
      const sectionLines: string[] = [heading];
      lyricLines.forEach((lyricLine, lineIndex) => {
        const inferredOffsets = Array.from(
          measureOffsetsByLine[lineIndex] ?? []
        )
          .sort((a, b) => a - b)
          .filter((offset) => offset >= 0 && offset < chordSymbolsByMeasure.length);
        if (inferredOffsets.length === 0) {
          while (
            fallbackMeasureCursor < chordSymbolsByMeasure.length &&
            usedMeasureOffsets.has(fallbackMeasureCursor)
          ) {
            fallbackMeasureCursor += 1;
          }
          if (fallbackMeasureCursor < chordSymbolsByMeasure.length) {
            inferredOffsets.push(fallbackMeasureCursor);
            fallbackMeasureCursor += 1;
          }
        }
        const lineChords = inferredOffsets.map(
          (offset) => chordSymbolsByMeasure[offset] ?? songKey
        );
        const alignedChordLine = alignChordsOverLine(lyricLine, lineChords);
        if (alignedChordLine.length > 0) {
          sectionLines.push(alignedChordLine);
        }
        inferredOffsets.forEach((offset) => usedMeasureOffsets.add(offset));
        sectionLines.push(lyricLine);
      });
      const remainingChords = chordSymbolsByMeasure.filter(
        (_, offset) => !usedMeasureOffsets.has(offset)
      );
      if (remainingChords.length > 0) {
        const instrumentalLines = formatRemainingMeasureChords(remainingChords);
        sectionLines.push(`Instrumental chords: ${instrumentalLines[0] ?? ''}`.trim());
        if (instrumentalLines.length > 1) {
          sectionLines.push(...instrumentalLines.slice(1));
        }
      }
      return sectionLines.join('\n');
    })
    .join('\n\n');
}

export type NotationSectionBlock = {
  id: string;
  title: string;
  isLoopActive: boolean;
  measureNumberOffset: number;
  showMeasureNumbers: boolean;
  rhythm: ReturnType<typeof parseRhythm>;
  localHitMap: Map<string, SyllableHit>;
  localChordLabelsByMeasure: Map<number, string>;
  localChordStyleByMeasure: Map<number, ChordStyleId>;
  localCurrentNote: { measureIndex: number; noteIndex: number } | null;
  localCurrentMetronomeBeat: {
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null;
  localActiveChordMeasure: number | null;
};

export function buildNotationSectionBlocks(params: {
  sectionRenderPlans: SectionRenderPlan[];
  timeSignature: TimeSignature;
  hitMap: Map<string, SyllableHit>;
  chordLabelsByMeasure: Map<number, string>;
  chordStyleByMeasure: Map<number, ChordStyleId>;
  currentNote: { measureIndex: number; noteIndex: number } | null | undefined;
  currentMetronomeBeat: {
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null | undefined;
  activeChordMeasure: number | null;
  activeSectionLoopId: string | null;
  isPlaying: boolean;
  sectionDisplayNames: string[];
  parsedMeasureCount: number;
}): NotationSectionBlock[] {
  const {
    sectionRenderPlans,
    timeSignature,
    hitMap,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    currentNote,
    currentMetronomeBeat,
    activeChordMeasure,
    activeSectionLoopId,
    isPlaying,
    sectionDisplayNames,
    parsedMeasureCount,
  } = params;

  return sectionRenderPlans.map((plan, index) => {
    const rhythm = parseRhythm(plan.sectionNotation, timeSignature);
    const localHitMap = new Map<string, SyllableHit>();
    rhythm.measures.forEach((measure, localMeasureIndex) => {
      measure.notes.forEach((_, noteIndex) => {
        const globalKey = `${plan.startMeasure + localMeasureIndex}-${noteIndex}`;
        const hit = hitMap.get(globalKey);
        if (hit) localHitMap.set(`${localMeasureIndex}-${noteIndex}`, hit);
      });
    });
    const localChordLabelsByMeasure = new Map<number, string>();
    const localChordStyleByMeasure = new Map<number, ChordStyleId>();
    for (let offset = 0; offset < plan.totalMeasureCount; offset += 1) {
      const globalMeasure = plan.startMeasure + offset;
      localChordLabelsByMeasure.set(
        offset,
        chordLabelsByMeasure.get(globalMeasure) ?? ''
      );
      localChordStyleByMeasure.set(
        offset,
        chordStyleByMeasure.get(globalMeasure) ?? plan.section.chordStyleId
      );
    }
    const localCurrentNote =
      currentNote &&
      currentNote.measureIndex >= plan.startMeasure &&
      currentNote.measureIndex < plan.startMeasure + plan.totalMeasureCount
        ? {
            measureIndex: currentNote.measureIndex - plan.startMeasure,
            noteIndex: currentNote.noteIndex,
          }
        : null;
    const localCurrentMetronomeBeat =
      currentMetronomeBeat &&
      currentMetronomeBeat.measureIndex >= plan.startMeasure &&
      currentMetronomeBeat.measureIndex < plan.startMeasure + plan.totalMeasureCount
        ? {
            ...currentMetronomeBeat,
            measureIndex:
              currentMetronomeBeat.measureIndex - plan.startMeasure,
          }
        : null;
    const localActiveChordMeasure =
      activeChordMeasure !== null &&
      activeChordMeasure >= plan.startMeasure &&
      activeChordMeasure < plan.startMeasure + plan.totalMeasureCount
        ? activeChordMeasure - plan.startMeasure
        : null;
    return {
      id: plan.section.id,
      title: sectionDisplayNames[index] ?? `Section ${index + 1}`,
      isLoopActive: isPlaying && activeSectionLoopId === plan.section.id,
      measureNumberOffset: plan.startMeasure,
      showMeasureNumbers: parsedMeasureCount > 4,
      rhythm,
      localHitMap,
      localChordLabelsByMeasure,
      localChordStyleByMeasure,
      localCurrentNote,
      localCurrentMetronomeBeat,
      localActiveChordMeasure,
    };
  });
}
