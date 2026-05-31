import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AudioPlayer } from '../../shared/audio/audioPlayer';
import { buildEffectiveAuxiliaryDrumGain } from '../../shared/music/playbackVolumeMix';
import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import { ALL_KEYS } from '../../shared/music/randomization';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  clampBpm,
  generateRandomTemplateNotation,
  getNoteSoundAtSixteenth,
  pickRandom,
} from '../utils/appRhythmHelpers';
import type { RandomizeMode } from '../utils/randomizeModes';
import { applyRandomizationTransform } from '../utils/wordsRandomization';
import {
  buildTemplateNotationPool,
  type TemplatePresetOption,
} from '../utils/wordsTemplateHelpers';
import type { WordsSectionsState } from './useWordsSectionsState';

export function useWordsRandomization(params: {
  sectionsState: Pick<
    WordsSectionsState,
    'sections' | 'songKey' | 'setSongKey' | 'applySectionsChange' | 'updateSection' | 'updateSectionTemplateNotation'
  >;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  setBackingBeatNotation: (notation: string) => void;
  timeSignature: TimeSignature;
  templatePresets: TemplatePresetOption[];
}) {
  const { sectionsState, setBpm, setBackingBeatNotation, timeSignature, templatePresets } = params;
  const {
    sections,
    songKey,
    setSongKey,
    applySectionsChange,
    updateSection,
    updateSectionTemplateNotation,
  } = sectionsState;

  const templateNotationPool = useMemo(
    () => buildTemplateNotationPool(templatePresets, timeSignature),
    [templatePresets, timeSignature]
  );

  const applyRandomization = useCallback(
    (mode: RandomizeMode, sectionId?: string) => {
      const nextKey = mode === 'everything' ? pickRandom(ALL_KEYS) : songKey;
      if (mode === 'everything') {
        setBpm(clampBpm(Math.round(80 + Math.random() * 70)));
        setSongKey(nextKey);
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
    [songKey, setBpm, setSongKey, applySectionsChange, templateNotationPool]
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

  const randomizeSectionTemplate = useCallback(
    (sectionId: string, mode: 'preset' | 'full') => {
      if (sections.find((section) => section.id === sectionId)?.isLocked) return;
      const notation =
        mode === 'preset'
          ? pickRandom(templateNotationPool)
          : generateRandomTemplateNotation(timeSignature);
      updateSectionTemplateNotation(sectionId, notation);
    },
    [sections, templateNotationPool, timeSignature, updateSectionTemplateNotation]
  );

  const randomizeBackingTemplate = useCallback(
    (mode: 'preset' | 'full') => {
      const notation =
        mode === 'preset'
          ? pickRandom(templateNotationPool)
          : generateRandomTemplateNotation(timeSignature);
      setBackingBeatNotation(notation);
    },
    [templateNotationPool, timeSignature, setBackingBeatNotation]
  );

  return {
    templateNotationPool,
    applyRandomization,
    randomizeChordProgression,
    randomizeChordStyle,
    randomizeSectionTemplate,
    randomizeBackingTemplate,
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
  const backingAudioPlayerRef = useRef<AudioPlayer | null>(null);
  const lastBackingTriggerRef = useRef<string | null>(null);

  useEffect(() => {
    const player = new AudioPlayer({
      soundUrls: params.drumSounds,
      enableReverb: false,
    });
    void player.initialize().then(() => {
      backingAudioPlayerRef.current = player;
    });
    return () => {
      player.destroy();
      backingAudioPlayerRef.current = null;
    };
  }, [params.drumSounds]);

  useEffect(() => {
    const {
      isPlaying,
      backingBeatEnabled,
      backingPatternRhythm,
      backingTemplateMeasureMap,
      currentMetronomeBeat,
      backingBeatVolume,
      backingBeatMuted,
      masterVolume,
      masterMuted,
    } = params;
    if (!isPlaying || !backingBeatEnabled || !currentMetronomeBeat || !backingPatternRhythm) {
      lastBackingTriggerRef.current = null;
      return;
    }
    const triggerKey = `${currentMetronomeBeat.measureIndex}-${currentMetronomeBeat.positionInSixteenths}`;
    if (lastBackingTriggerRef.current === triggerKey) return;
    lastBackingTriggerRef.current = triggerKey;
    const sixteenthOffset = currentMetronomeBeat.positionInSixteenths;
    const templateMeasureNotes = backingTemplateMeasureMap.get(
      currentMetronomeBeat.measureIndex
    );
    const fallbackPatternMeasure =
      backingPatternRhythm.measures[
        currentMetronomeBeat.measureIndex % backingPatternRhythm.measures.length
      ];
    const patternNotes = templateMeasureNotes ?? fallbackPatternMeasure?.notes;
    if (!patternNotes) return;
    const sound = getNoteSoundAtSixteenth(patternNotes, sixteenthOffset);
    if (!sound || sound === 'rest' || sound === '_') return;
    const player = backingAudioPlayerRef.current;
    if (!player) return;
    const gain = buildEffectiveAuxiliaryDrumGain({
      channelVolume: backingBeatVolume,
      channelMuted: backingBeatMuted,
      masterVolume,
      masterMuted,
    });
    const soundToken =
      sound === 'dum' || sound === 'tak' || sound === 'ka' || sound === 'slap'
        ? sound
        : null;
    if (!soundToken) return;
    player.play(soundToken, gain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.isPlaying,
    params.backingBeatEnabled,
    params.backingPatternRhythm,
    params.backingTemplateMeasureMap,
    params.currentMetronomeBeat,
    params.backingBeatVolume,
    params.backingBeatMuted,
    params.masterVolume,
    params.masterMuted,
  ]);
}
