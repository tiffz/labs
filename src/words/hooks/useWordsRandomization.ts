import { useCallback, useMemo } from 'react';
import { buildEffectiveAuxiliaryDrumGain } from '../../shared/music/playbackVolumeMix';
import { useLookAheadBackingBeat } from '../../shared/audio/platform/hooks/useLookAheadBackingBeat';
import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import { randomSongKey, type SongKey } from '../../shared/music/songKeyFormat';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  clampBpm,
  pickRandom,
} from '../utils/appRhythmHelpers';
import type { RandomizeMode } from '../utils/randomizeModes';
import { applyRandomizationTransform } from '../utils/wordsRandomization';
import {
  buildTemplateNotationPool,
  type TemplatePresetOption,
} from '../utils/wordsTemplateHelpers';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { WordsSectionsState } from './useWordsSectionsState';
import {
  cloneWordsDocumentSnapshot,
  type WordsDocumentSnapshot,
} from '../utils/wordsDocumentSnapshot';
import { normalizeSectionsSnapshot, cloneSectionsSnapshot } from '../utils/sectionSnapshot';

export function useWordsRandomization(params: {
  sectionsState: Pick<
    WordsSectionsState,
    | 'sections'
    | 'songKey'
    | 'setSongKey'
    | 'setSections'
    | 'applySectionsChange'
    | 'pushManualUndo'
    | 'updateSection'
  >;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  bpm: number;
  timeSignature: TimeSignature;
  templatePresets: TemplatePresetOption[];
}) {
  const { sectionsState, setBpm, bpm, timeSignature, templatePresets } = params;
  const { isReplayingRef } = useLabsUndo();
  const {
    sections,
    songKey,
    setSongKey,
    setSections,
    applySectionsChange,
    pushManualUndo,
    updateSection,
  } = sectionsState;

  const templateNotationPool = useMemo(
    () => buildTemplateNotationPool(templatePresets, timeSignature),
    [templatePresets, timeSignature]
  );

  const applyRandomization = useCallback(
    (mode: RandomizeMode, sectionId?: string) => {
      const nextKey: SongKey = mode === 'everything' ? randomSongKey() : songKey;
      const nextBpm =
        mode === 'everything' ? clampBpm(Math.round(80 + Math.random() * 70)) : bpm;

      if (mode === 'everything') {
        const before: WordsDocumentSnapshot = { sections, songKey, bpm };
        const nextSections = applyRandomizationTransform(sections, {
          mode,
          sectionId,
          nextKey,
          templateNotationPool,
        });
        const after: WordsDocumentSnapshot = {
          sections: nextSections,
          songKey: nextKey,
          bpm: nextBpm,
        };
        const beforeClone = cloneWordsDocumentSnapshot(before);
        const afterClone = cloneWordsDocumentSnapshot(after);
        pushManualUndo({
          undo: () => {
            isReplayingRef.current = true;
            setSections(
              normalizeSectionsSnapshot(cloneSectionsSnapshot(beforeClone.sections))
            );
            setSongKey(beforeClone.songKey);
            setBpm(beforeClone.bpm ?? bpm);
            isReplayingRef.current = false;
          },
          redo: () => {
            isReplayingRef.current = true;
            setSections(
              normalizeSectionsSnapshot(cloneSectionsSnapshot(afterClone.sections))
            );
            setSongKey(afterClone.songKey);
            setBpm(afterClone.bpm ?? bpm);
            isReplayingRef.current = false;
          },
        });
        setSections(normalizeSectionsSnapshot(cloneSectionsSnapshot(nextSections)));
        setSongKey(nextKey);
        setBpm(nextBpm);
        return;
      }

      applySectionsChange((previous) =>
        applyRandomizationTransform(previous, {
          mode,
          sectionId,
          nextKey,
          templateNotationPool,
        })
      );
    },
    [
      songKey,
      bpm,
      sections,
      setBpm,
      setSongKey,
      setSections,
      applySectionsChange,
      pushManualUndo,
      templateNotationPool,
      isReplayingRef,
    ]
  );

  const randomizeChordProgression = useCallback(
    (sectionId: string) => applyRandomization('chords', sectionId),
    [applyRandomization]
  );

  const randomizeChordStyle = useCallback(
    (sectionId: string) => {
      if (sections.find((section) => section.id === sectionId)?.isLocked) return;
      const nextStyle = pickRandom(CHORD_STYLE_OPTIONS).id;
      updateSection(sectionId, (section) => ({
        ...section,
        chordStyleId: nextStyle,
      }));
    },
    [sections, updateSection]
  );

  return {
    templateNotationPool,
    applyRandomization,
    randomizeChordProgression,
    randomizeChordStyle,
  };
}

export function useWordsBackingBeatPlayback(params: {
  isPlaying: boolean;
  backingBeatEnabled: boolean;
  backingPatternRhythm: ReturnType<
    typeof import('../../shared/rhythm/rhythmParser').parseRhythm
  > | null;
  backingTemplateMeasureMap: Map<
    number,
    Array<{ durationInSixteenths: number; sound: string }>
  >;
  currentMetronomeBeat: {
    measureIndex: number;
    positionInSixteenths: number;
  } | null;
  backingBeatVolume: number;
  backingBeatMuted: boolean;
  masterVolume: number;
  masterMuted: boolean;
  drumSounds: Record<string, string>;
}) {
  const gain = useMemo(
    () =>
      buildEffectiveAuxiliaryDrumGain({
        channelVolume: params.backingBeatVolume,
        channelMuted: params.backingBeatMuted,
        masterVolume: params.masterVolume,
        masterMuted: params.masterMuted,
      }),
    [
      params.backingBeatVolume,
      params.backingBeatMuted,
      params.masterVolume,
      params.masterMuted,
    ],
  );

  useLookAheadBackingBeat({
    enabled: params.isPlaying && params.backingBeatEnabled,
    pattern: params.backingPatternRhythm,
    gain,
    soundUrls: params.drumSounds,
  });
}
