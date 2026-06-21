import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';
import { parseProgressionText } from '../../shared/music/chordProgressionText';
import {
  buildSectionChordSymbols,
  computeCompletionPadMeasures,
} from '../../shared/music/chordProgressionCompletion';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { SongKey } from '../../shared/music/songKeyFormat';
import { songKeyToTonic } from '../../shared/music/chordTheory';
import type { SongSection } from '../../shared/music/songSections';
import {
  generateWordRhythm,
  type WordRhythmGenerationSettings,
  type WordRhythmResult,
} from './prosodyEngine';
import { APP_DEFAULT_GENERATION_SETTINGS } from './wordsAppDefaults';

export type EffectiveSection = SongSection & {
  effectiveLyrics: string;
  effectiveTemplateNotation: string;
};

export type SectionRenderPlan = {
  section: EffectiveSection;
  result: WordRhythmResult;
  sectionNotation: string;
  startMeasure: number;
  sectionMeasureCount: number;
  totalMeasureCount: number;
};

export function buildEffectiveSections(sections: SongSection[]): EffectiveSection[] {
  const output: EffectiveSection[] = [];
  const linkedChorusLyricsSource = sections.find(
    (section) => section.type === 'chorus' && section.linkedToPreviousChorusLyrics
  );
  const linkedChorusTemplateSource = sections.find(
    (section) => section.type === 'chorus' && section.linkedToPreviousChorusTemplate
  );
  sections.forEach((section) => {
    const fallbackLyrics = section.lyrics || '';
    const inheritedLyrics =
      section.type === 'chorus' &&
      section.linkedToPreviousChorusLyrics &&
      linkedChorusLyricsSource
        ? linkedChorusLyricsSource.lyrics
        : fallbackLyrics;
    const inheritedTemplateNotation =
      section.type === 'chorus' &&
      section.linkedToPreviousChorusTemplate &&
      linkedChorusTemplateSource
        ? linkedChorusTemplateSource.templateNotation
        : section.templateNotation;
    output.push({
      ...section,
      effectiveLyrics: inheritedLyrics,
      effectiveTemplateNotation:
        inheritedTemplateNotation ||
        APP_DEFAULT_GENERATION_SETTINGS.templateNotation ||
        '',
    });
  });
  return output;
}

export function buildSectionProgressions(
  effectiveSections: EffectiveSection[],
  songKey: SongKey
) {
  return effectiveSections.map((section) => {
    const parsed = parseProgressionText(section.chordProgressionInput, songKeyToTonic(songKey));
    if (parsed.format !== 'empty' && parsed.tokens.length < 2) {
      return { ...parsed, isValid: false, format: 'invalid' as const };
    }
    return parsed;
  });
}

export function buildSectionRenderPlans(
  effectiveSections: EffectiveSection[],
  sectionProgressions: ReturnType<typeof buildSectionProgressions>,
  generationSettings: WordRhythmGenerationSettings,
  timeSignature: TimeSignature,
  fullMeasureRestNotation: string
): SectionRenderPlan[] {
  let startMeasureCursor = 0;
  return effectiveSections.map((section, sectionIndex) => {
    const result = generateWordRhythm(section.effectiveLyrics, {
      strictDictionaryMode: false,
      timeSignature,
      rhythmVariationSeed: section.rhythmVariationSeed,
      soundVariationSeed: section.soundVariationSeed,
      generationSettings: {
        ...generationSettings,
        templateNotation: section.effectiveTemplateNotation,
      },
    });
    const parsed = parseRhythm(result.notation, timeSignature);
    const baseMeasureCount = parsed.measures.length;
    const progression = sectionProgressions[sectionIndex];
    const progressionLength =
      progression?.isValid && progression.chordSymbols.length > 0
        ? progression.chordSymbols.length
        : 0;
    const completionPadMeasures = computeCompletionPadMeasures(
      baseMeasureCount,
      progressionLength
    );
    const trailingGapMeasures = 0;
    const sectionMeasureCount = baseMeasureCount + completionPadMeasures;
    const totalMeasureCount = sectionMeasureCount + trailingGapMeasures;
    const extraMeasures = Array(completionPadMeasures + trailingGapMeasures).fill(
      fullMeasureRestNotation
    );
    const sectionNotation = [result.notation, ...extraMeasures]
      .filter((chunk) => chunk.trim().length > 0)
      .join('|');
    const startMeasure = startMeasureCursor;
    startMeasureCursor += totalMeasureCount;
    return {
      section,
      result,
      sectionNotation,
      startMeasure,
      sectionMeasureCount,
      totalMeasureCount,
    };
  });
}

export function buildSectionMeasureRanges(sectionRenderPlans: SectionRenderPlan[]) {
  return sectionRenderPlans.map((plan) => ({
    startMeasure: plan.startMeasure,
    measureCount: plan.sectionMeasureCount,
  }));
}

export function buildSectionTickRanges(
  sectionMeasureRanges: ReturnType<typeof buildSectionMeasureRanges>,
  sixteenthsPerMeasure: number
) {
  return sectionMeasureRanges.map((range) => ({
    startTick: Math.max(0, Math.round(range.startMeasure * sixteenthsPerMeasure)),
    endTick: Math.max(
      1,
      Math.round((range.startMeasure + range.measureCount) * sixteenthsPerMeasure)
    ),
  }));
}

export function buildChordLabelsByMeasure(
  parsedMeasureCount: number,
  sectionRenderPlans: SectionRenderPlan[],
  sectionProgressions: ReturnType<typeof buildSectionProgressions>,
  songKey: SongKey
): Map<number, string> {
  const labels = new Map<number, string>();
  if (parsedMeasureCount === 0) return labels;
  sectionRenderPlans.forEach((plan, sectionIndex) => {
    const progression = sectionProgressions[sectionIndex];
    if (
      !progression ||
      !progression.isValid ||
      progression.chordSymbols.length === 0
    ) {
      return;
    }
    const sectionChordSymbols = buildSectionChordSymbols(
      progression.chordSymbols,
      plan.sectionMeasureCount,
      plan.totalMeasureCount
    );
    sectionChordSymbols.forEach((symbol, offset) => {
      labels.set(plan.startMeasure + offset, symbol);
    });
  });
  let carryChord: string = songKey;
  for (let measureIndex = 0; measureIndex < parsedMeasureCount; measureIndex += 1) {
    const chord = labels.get(measureIndex);
    if (chord && chord.trim().length > 0) {
      carryChord = chord;
    } else {
      labels.set(measureIndex, carryChord);
    }
  }
  return labels;
}

export function buildChordStyleByMeasure(
  sectionRenderPlans: SectionRenderPlan[]
): Map<number, ChordStyleId> {
  const styles = new Map<number, ChordStyleId>();
  sectionRenderPlans.forEach((plan) => {
    for (let offset = 0; offset < plan.totalMeasureCount; offset += 1) {
      styles.set(plan.startMeasure + offset, plan.section.chordStyleId);
    }
  });
  return styles;
}

export function buildSectionDisplayNames(sections: SongSection[]): string[] {
  const totals = { verse: 0, chorus: 0, bridge: 0 };
  sections.forEach((section) => {
    totals[section.type] += 1;
  });
  const seen = { verse: 0, chorus: 0, bridge: 0 };
  return sections.map((section) => {
    seen[section.type] += 1;
    const baseLabel =
      section.type === 'verse'
        ? 'Verse'
        : section.type === 'chorus'
          ? 'Chorus'
          : 'Bridge';
    if (totals[section.type] <= 1) return baseLabel;
    return `${baseLabel} ${seen[section.type]}`;
  });
}
