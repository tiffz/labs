import { useMemo } from 'react';
import type { RefObject } from 'react';
import { primeAudioContext } from '../../shared/playback/audioContextLifecycle';
import { ALL_KEYS } from '../../shared/music/randomization';
import type { Key } from '../../shared/music/chordTypes';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SampledPianoLoadState } from '../../shared/music/sampledPianoLoadState';
import type { SoundType } from '../../shared/music/soundOptions';
import type { WordsPlaybackRailProps } from '../components/WordsPlaybackRail';
import { clampBpm, pickRandom } from '../utils/appRhythmHelpers';
import {
  BACKING_FALLBACK_TEMPLATE,
  TIME_SIGNATURE_OPTIONS,
} from '../utils/wordsAppDefaults';

export function useWordsPlaybackRailProps(params: {
  isPlaying: boolean;
  stopPlaybackImmediately: () => void;
  setActiveSectionLoopId: (id: string | null) => void;
  playAllSections: () => void;
  chordAudioContextRef: RefObject<AudioContext | null>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  songKey: Key;
  setSongKey: React.Dispatch<React.SetStateAction<Key>>;
  timeSignature: TimeSignature;
  setTimeSignature: React.Dispatch<React.SetStateAction<TimeSignature>>;
  metronomeEnabled: boolean;
  setMetronomeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleMetronomeToggle: (enabled: boolean) => void;
  soundButtonRef: RefObject<HTMLButtonElement | null>;
  soundMenuRef: RefObject<HTMLDivElement | null>;
  soundMenuOpen: boolean;
  setSoundMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGenerationMenuOpen: (open: boolean) => void;
  masterVolume: number;
  setMasterVolume: React.Dispatch<React.SetStateAction<number>>;
  masterMuted: boolean;
  setMasterMuted: React.Dispatch<React.SetStateAction<boolean>>;
  drumsVolume: number;
  setDrumsVolume: React.Dispatch<React.SetStateAction<number>>;
  drumsMuted: boolean;
  setDrumsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  playbackSettings: WordsPlaybackRailProps['soundMenuProps']['playbackSettings'];
  setPlaybackSettings: WordsPlaybackRailProps['soundMenuProps']['onPlaybackSettingsChange'];
  accentMuted: boolean;
  setAccentMuted: React.Dispatch<React.SetStateAction<boolean>>;
  metronomeMuted: boolean;
  setMetronomeMuted: React.Dispatch<React.SetStateAction<boolean>>;
  chordSoundType: SoundType;
  setChordSoundType: React.Dispatch<React.SetStateAction<SoundType>>;
  sampledPianoLoad: SampledPianoLoadState;
  chordVolume: number;
  setChordVolume: React.Dispatch<React.SetStateAction<number>>;
  chordMuted: boolean;
  setChordMuted: React.Dispatch<React.SetStateAction<boolean>>;
  backingBeatEnabled: boolean;
  setBackingBeatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  backingBeatVolume: number;
  setBackingBeatVolume: React.Dispatch<React.SetStateAction<number>>;
  backingBeatMuted: boolean;
  setBackingBeatMuted: React.Dispatch<React.SetStateAction<boolean>>;
  backingBeatUseTemplate: boolean;
  setBackingBeatUseTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  backingBeatNotation: string;
  setBackingBeatNotation: React.Dispatch<React.SetStateAction<string>>;
  autoFollowPlayback: boolean;
  setAutoFollowPlayback: React.Dispatch<React.SetStateAction<boolean>>;
}): WordsPlaybackRailProps {
  const {
    isPlaying,
    stopPlaybackImmediately,
    setActiveSectionLoopId,
    playAllSections,
    chordAudioContextRef,
    bpm,
    setBpm,
    songKey,
    setSongKey,
    timeSignature,
    setTimeSignature,
    metronomeEnabled,
    setMetronomeEnabled,
    handleMetronomeToggle,
    soundButtonRef,
    soundMenuRef,
    soundMenuOpen,
    setSoundMenuOpen,
    setGenerationMenuOpen,
    masterVolume,
    setMasterVolume,
    masterMuted,
    setMasterMuted,
    drumsVolume,
    setDrumsVolume,
    drumsMuted,
    setDrumsMuted,
    playbackSettings,
    setPlaybackSettings,
    accentMuted,
    setAccentMuted,
    metronomeMuted,
    setMetronomeMuted,
    chordSoundType,
    setChordSoundType,
    sampledPianoLoad,
    chordVolume,
    setChordVolume,
    chordMuted,
    setChordMuted,
    backingBeatEnabled,
    setBackingBeatEnabled,
    backingBeatVolume,
    setBackingBeatVolume,
    backingBeatMuted,
    setBackingBeatMuted,
    backingBeatUseTemplate,
    setBackingBeatUseTemplate,
    backingBeatNotation,
    setBackingBeatNotation,
    autoFollowPlayback,
    setAutoFollowPlayback,
  } = params;

  return useMemo(
    () => ({
      isPlaying,
      onPlayStop: () => {
        if (isPlaying) {
          stopPlaybackImmediately();
          setActiveSectionLoopId(null);
          return;
        }
        if (!chordAudioContextRef.current) {
          chordAudioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
        }
        primeAudioContext(chordAudioContextRef.current);
        playAllSections();
      },
      bpm,
      onBpmChange: (next) => setBpm(clampBpm(next)),
      onRandomizeBpm: () => setBpm(clampBpm(Math.round(80 + Math.random() * 70))),
      songKey,
      onKeyChange: (next) => setSongKey(next),
      onRandomizeKey: () => setSongKey(pickRandom(ALL_KEYS)),
      timeSignature,
      timeSignatureOptions: TIME_SIGNATURE_OPTIONS,
      onTimeSignatureChange: setTimeSignature,
      metronomeEnabled,
      onMetronomeToggle: (enabled) => {
        setMetronomeEnabled(enabled);
        handleMetronomeToggle(enabled);
      },
      soundButtonRef,
      soundMenuOpen,
      onToggleSoundMenu: () => {
        setSoundMenuOpen((previous) => !previous);
        setGenerationMenuOpen(false);
      },
      soundMenuProps: {
        menuRef: soundMenuRef,
        masterVolume,
        onMasterVolumeChange: setMasterVolume,
        masterMuted,
        onMasterMutedToggle: () => setMasterMuted((previous) => !previous),
        drumsVolume,
        onDrumsVolumeChange: setDrumsVolume,
        drumsMuted,
        onDrumsMutedToggle: () => setDrumsMuted((previous) => !previous),
        playbackSettings,
        onPlaybackSettingsChange: setPlaybackSettings,
        accentMuted,
        onAccentMutedToggle: () => setAccentMuted((previous) => !previous),
        metronomeMuted,
        onMetronomeMutedToggle: () => setMetronomeMuted((previous) => !previous),
        chordSoundType,
        onChordSoundTypeChange: setChordSoundType,
        sampledPianoLoad,
        chordVolume,
        onChordVolumeChange: setChordVolume,
        chordMuted,
        onChordMutedToggle: () => setChordMuted((previous) => !previous),
        backingBeatEnabled,
        onBackingBeatEnabledChange: setBackingBeatEnabled,
        backingBeatVolume,
        onBackingBeatVolumeChange: setBackingBeatVolume,
        backingBeatMuted,
        onBackingBeatMutedToggle: () => setBackingBeatMuted((previous) => !previous),
        backingBeatUseTemplate,
        onBackingBeatUseTemplateChange: setBackingBeatUseTemplate,
        backingBeatNotation,
        onBackingBeatNotationChange: setBackingBeatNotation,
        backingFallbackTemplate: BACKING_FALLBACK_TEMPLATE,
        bpm,
        timeSignature,
        metronomeEnabled,
        autoFollowPlayback,
        onAutoFollowPlaybackChange: setAutoFollowPlayback,
      },
    }),
    [
      isPlaying,
      stopPlaybackImmediately,
      setActiveSectionLoopId,
      playAllSections,
      chordAudioContextRef,
      bpm,
      setBpm,
      songKey,
      setSongKey,
      timeSignature,
      setTimeSignature,
      metronomeEnabled,
      setMetronomeEnabled,
      handleMetronomeToggle,
      soundButtonRef,
      soundMenuOpen,
      setSoundMenuOpen,
      setGenerationMenuOpen,
      soundMenuRef,
      masterVolume,
      setMasterVolume,
      masterMuted,
      setMasterMuted,
      drumsVolume,
      setDrumsVolume,
      drumsMuted,
      setDrumsMuted,
      playbackSettings,
      setPlaybackSettings,
      accentMuted,
      setAccentMuted,
      metronomeMuted,
      setMetronomeMuted,
      chordSoundType,
      setChordSoundType,
      sampledPianoLoad,
      chordVolume,
      setChordVolume,
      chordMuted,
      setChordMuted,
      backingBeatEnabled,
      setBackingBeatEnabled,
      backingBeatVolume,
      setBackingBeatVolume,
      backingBeatMuted,
      setBackingBeatMuted,
      backingBeatUseTemplate,
      setBackingBeatUseTemplate,
      backingBeatNotation,
      setBackingBeatNotation,
      autoFollowPlayback,
      setAutoFollowPlayback,
    ]
  );
}
