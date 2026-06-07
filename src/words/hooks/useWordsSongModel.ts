import { useEffect, useMemo, useState } from 'react';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { PlaybackSettings, TimeSignature } from '../../shared/rhythm/types';
import {
  buildEffectiveChannelGain,
  buildEffectiveDrumPlaybackSettings,
} from '../../shared/music/playbackVolumeMix';
import type { Key } from '../../shared/music/chordTypes';
import type { SongSection } from '../../shared/music/songSections';
import { createWordsExportAdapter } from '../utils/exportAdapter';
import type { WordRhythmGenerationSettings, WordRhythmResult } from '../utils/prosodyEngine';
import { DEFAULT_WORD_RESULT } from '../utils/wordsAppDefaults';
import {
  buildChordLabelsByMeasure,
  buildChordStyleByMeasure,
  buildEffectiveSections,
  buildSectionDisplayNames,
  buildSectionMeasureRanges,
  buildSectionProgressions,
  buildSectionRenderPlans,
  buildSectionTickRanges,
} from '../utils/wordsSectionPlans';
import {
  buildAsciiChordChartExportText,
  buildLyricsExportText,
} from '../utils/wordsChordExportText';
import {
  buildBackingPatternRhythm,
  buildBackingTemplateMeasureMap,
  buildTemplatePresets,
} from '../utils/wordsTemplateHelpers';
import {
  buildDarbukaEditUrl,
  buildHitMap,
  estimateSongDuration,
  mergeSectionRenderResults,
} from '../utils/wordsSongDerived';

export function useWordsSongModel(params: {
  sections: SongSection[];
  songKey: Key;
  notation: string;
  setNotation: React.Dispatch<React.SetStateAction<string>>;
  timeSignature: TimeSignature;
  bpm: number;
  metronomeEnabled: boolean;
  generationSettings: WordRhythmGenerationSettings;
  playbackSettings: PlaybackSettings;
  drumsVolume: number;
  drumsMuted: boolean;
  accentMuted: boolean;
  metronomeMuted: boolean;
  masterVolume: number;
  masterMuted: boolean;
  chordVolume: number;
  chordMuted: boolean;
  backingBeatEnabled: boolean;
  backingBeatUseTemplate: boolean;
  backingBeatNotation: string;
}) {
  const {
    sections,
    songKey,
    notation,
    setNotation,
    timeSignature,
    bpm,
    metronomeEnabled,
    generationSettings,
    playbackSettings,
    drumsVolume,
    drumsMuted,
    accentMuted,
    metronomeMuted,
    masterVolume,
    masterMuted,
    chordVolume,
    chordMuted,
    backingBeatEnabled,
    backingBeatUseTemplate,
    backingBeatNotation,
  } = params;

  const [generated, setGenerated] = useState<WordRhythmResult>(() => DEFAULT_WORD_RESULT);

  const parsedRhythm = useMemo(
    () => parseRhythm(notation, timeSignature),
    [notation, timeSignature]
  );
  const templatePresets = useMemo(
    () => buildTemplatePresets(timeSignature),
    [timeSignature]
  );
  const effectiveSections = useMemo(
    () => buildEffectiveSections(sections),
    [sections]
  );
  const sectionDisplayNames = useMemo(
    () => buildSectionDisplayNames(sections),
    [sections]
  );
  const sectionProgressions = useMemo(
    () => buildSectionProgressions(effectiveSections, songKey),
    [effectiveSections, songKey]
  );
  const sixteenthsPerMeasure = Math.max(
    1,
    Math.round((timeSignature.numerator * 16) / timeSignature.denominator)
  );
  const fullMeasureRestNotation = useMemo(
    () => '_'.repeat(sixteenthsPerMeasure),
    [sixteenthsPerMeasure]
  );
  const sectionRenderPlans = useMemo(
    () =>
      buildSectionRenderPlans(
        effectiveSections,
        sectionProgressions,
        generationSettings,
        timeSignature,
        fullMeasureRestNotation
      ),
    [
      effectiveSections,
      generationSettings,
      sectionProgressions,
      timeSignature,
      fullMeasureRestNotation,
    ]
  );
  const sectionMeasureRanges = useMemo(
    () => buildSectionMeasureRanges(sectionRenderPlans),
    [sectionRenderPlans]
  );
  const sectionTickRanges = useMemo(
    () => buildSectionTickRanges(sectionMeasureRanges, sixteenthsPerMeasure),
    [sectionMeasureRanges, sixteenthsPerMeasure]
  );
  const backingPatternRhythm = useMemo(
    () =>
      buildBackingPatternRhythm({
        backingBeatEnabled,
        backingBeatUseTemplate,
        backingBeatNotation,
        timeSignature,
        effectiveSections,
        templatePresets,
      }),
    [
      backingBeatEnabled,
      backingBeatUseTemplate,
      backingBeatNotation,
      timeSignature,
      effectiveSections,
      templatePresets,
    ]
  );
  const backingTemplateMeasureMap = useMemo(
    () =>
      buildBackingTemplateMeasureMap({
        backingBeatEnabled,
        backingBeatUseTemplate,
        sectionRenderPlans,
        timeSignature,
      }),
    [backingBeatEnabled, backingBeatUseTemplate, sectionRenderPlans, timeSignature]
  );
  const chordLabelsByMeasure = useMemo(
    () =>
      buildChordLabelsByMeasure(
        parsedRhythm.measures.length,
        sectionRenderPlans,
        sectionProgressions,
        songKey
      ),
    [parsedRhythm.measures.length, sectionRenderPlans, sectionProgressions, songKey]
  );
  const chordStyleByMeasure = useMemo(
    () => buildChordStyleByMeasure(sectionRenderPlans),
    [sectionRenderPlans]
  );
  const exportAdapter = useMemo(
    () =>
      createWordsExportAdapter({
        parsedRhythm,
        bpm,
        songKey,
        timeSignature,
        chordLabelsByMeasure,
        chordStyleByMeasure,
      }),
    [parsedRhythm, bpm, songKey, timeSignature, chordLabelsByMeasure, chordStyleByMeasure]
  );
  const effectivePlaybackSettings = useMemo(
    () =>
      buildEffectiveDrumPlaybackSettings({
        playbackSettings,
        drumsVolume,
        drumsMuted,
        accentMuted,
        metronomeMuted,
        masterVolume,
        masterMuted,
      }),
    [
      playbackSettings,
      drumsVolume,
      drumsMuted,
      accentMuted,
      metronomeMuted,
      masterVolume,
      masterMuted,
    ]
  );
  const effectiveChordVolume = useMemo(
    () =>
      buildEffectiveChannelGain({
        channelVolume: chordVolume,
        channelMuted: chordMuted,
        masterVolume,
        masterMuted,
      }),
    [chordVolume, chordMuted, masterVolume, masterMuted]
  );
  const hitMap = useMemo(
    () => buildHitMap(parsedRhythm, generated.hits),
    [generated.hits, parsedRhythm]
  );
  const darbukaEditUrl = useMemo(
    () => buildDarbukaEditUrl({ notation, timeSignature, bpm, metronomeEnabled }),
    [notation, timeSignature, bpm, metronomeEnabled]
  );
  const lyricsExportText = useMemo(
    () => buildLyricsExportText(effectiveSections, sectionDisplayNames),
    [effectiveSections, sectionDisplayNames]
  );
  const asciiChordChartExportText = useMemo(
    () =>
      buildAsciiChordChartExportText(
        effectiveSections,
        sectionDisplayNames,
        sectionRenderPlans,
        chordLabelsByMeasure,
        songKey,
        sixteenthsPerMeasure
      ),
    [
      effectiveSections,
      sectionDisplayNames,
      sectionRenderPlans,
      chordLabelsByMeasure,
      songKey,
      sixteenthsPerMeasure,
    ]
  );
  const scoreMeasureCount = parsedRhythm.measures.length;
  const estimatedSongDuration = useMemo(
    () => estimateSongDuration(parsedRhythm.measures, bpm),
    [parsedRhythm.measures, bpm]
  );

  useEffect(() => {
    const mergedResult = mergeSectionRenderResults(sectionRenderPlans, sixteenthsPerMeasure);
    setGenerated(mergedResult);
    setNotation(mergedResult.notation);
  }, [sectionRenderPlans, sixteenthsPerMeasure, setNotation]);

  return {
    generated,
    parsedRhythm,
    templatePresets,
    effectiveSections,
    sectionDisplayNames,
    sectionRenderPlans,
    sectionTickRanges,
    backingPatternRhythm,
    backingTemplateMeasureMap,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    exportAdapter,
    effectivePlaybackSettings,
    effectiveChordVolume,
    hitMap,
    darbukaEditUrl,
    lyricsExportText,
    asciiChordChartExportText,
    scoreMeasureCount,
    estimatedSongDuration,
    sixteenthsPerMeasure,
  };
}
