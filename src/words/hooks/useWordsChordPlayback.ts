import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { Chord as TheoryChord, ChordQuality } from '../../shared/music/chordTypes';
import { generateVoicing } from '../../shared/music/chordVoicing';
import { getChordHitsForStyle } from '../../shared/music/chordStyleHits';
import { midiToFrequency } from '../../shared/music/noteMath';
import type { SoundType } from '../../shared/music/soundOptions';
import {
  IDLE_SAMPLED_PIANO_LOAD_STATE,
  type SampledPianoLoadState,
} from '../../shared/music/sampledPianoLoadState';
import {
  PianoSynthesizer,
  SampledPiano,
  SimpleSynthesizer,
  type Instrument,
  type WaveformType,
} from '../../shared/playback/instruments';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';
import { CHORD_PARSE_REGEX } from '../utils/wordsAppDefaults';

export type WordsChordPlaybackRefs = {
  chordAudioContextRef: RefObject<AudioContext | null>;
  chordSampledPianoRef: RefObject<SampledPiano | null>;
  chordInstrumentRef: RefObject<Instrument | null>;
  chordInstrumentTypeRef: RefObject<SoundType | null>;
  lastChordMeasureRef: RefObject<number | null>;
};

export function useWordsChordPlayback(params: {
  isPlaying: boolean;
  chordLabelsByMeasure: Map<number, string>;
  chordStyleByMeasure: Map<number, ChordStyleId>;
  currentMetronomeBeat: {
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null;
  currentNote: { measureIndex: number; noteIndex: number } | null;
  parsedRhythm: ReturnType<typeof parseRhythm>;
  bpm: number;
  timeSignature: TimeSignature;
  effectiveChordVolume: number;
  chordSoundType: SoundType;
  sampledPianoLoad: SampledPianoLoadState;
  setSampledPianoLoad: React.Dispatch<React.SetStateAction<SampledPianoLoadState>>;
  refs: WordsChordPlaybackRefs;
}): void {
  const {
    isPlaying,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    currentMetronomeBeat,
    currentNote,
    parsedRhythm,
    bpm,
    timeSignature,
    effectiveChordVolume,
    chordSoundType,
    sampledPianoLoad,
    setSampledPianoLoad,
    refs,
  } = params;

  const sampledPianoLoadRef = useRef(sampledPianoLoad);
  sampledPianoLoadRef.current = sampledPianoLoad;

  useEffect(
    () => () => {
      refs.chordSampledPianoRef.current?.setLoadingProgressCallback(null);
      refs.chordInstrumentRef.current?.stopAll(20);
      refs.chordInstrumentRef.current?.disconnect();
      refs.chordInstrumentRef.current = null;
      refs.chordSampledPianoRef.current = null;
      refs.chordInstrumentTypeRef.current = null;
      if (refs.chordAudioContextRef.current) {
        void refs.chordAudioContextRef.current.close();
      }
      refs.chordAudioContextRef.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!isPlaying) {
      refs.lastChordMeasureRef.current = null;
      refs.chordInstrumentRef.current?.stopAll(10);
      return;
    }
    if (chordLabelsByMeasure.size === 0) {
      return;
    }
    const measureIndex =
      currentMetronomeBeat?.measureIndex ?? currentNote?.measureIndex ?? null;
    const isMeasureStart = currentMetronomeBeat
      ? currentMetronomeBeat.isDownbeat
      : currentNote?.noteIndex === 0;
    if (measureIndex === null || !isMeasureStart) {
      return;
    }
    if (refs.lastChordMeasureRef.current === measureIndex) return;
    refs.lastChordMeasureRef.current = measureIndex;

    const chordToken = chordLabelsByMeasure.get(measureIndex) ?? '';
    if (!chordToken) return;

    const parsed = chordToken.match(CHORD_PARSE_REGEX);
    if (!parsed) return;
    const root = parsed[1] ?? 'C';
    const suffix = (parsed[2] ?? '').toLowerCase();
    const qualityBySuffix: Record<string, ChordQuality> = {
      '': 'major',
      m: 'minor',
      dim: 'diminished',
      aug: 'augmented',
      sus2: 'sus2',
      sus4: 'sus4',
      '7': 'dominant7',
      maj7: 'major7',
      m7: 'minor7',
    };
    const quality = qualityBySuffix[suffix];
    if (!quality) return;
    const normalizedRoot = `${root[0]?.toUpperCase() ?? 'C'}${root.slice(1)}`;
    const chord: TheoryChord = {
      root: normalizedRoot,
      quality,
      inversion: 0,
      octave: 4,
    };

    const ensureInstrument = async (): Promise<{
      ctx: AudioContext;
      instrument: Instrument;
    } | null> => {
      if (!refs.chordAudioContextRef.current) {
        refs.chordAudioContextRef.current = new AudioContext({
          latencyHint: 'interactive',
        });
      }
      const ctx = refs.chordAudioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      if (
        refs.chordInstrumentRef.current &&
        refs.chordInstrumentTypeRef.current === chordSoundType &&
        (chordSoundType !== 'piano-sampled' ||
          refs.chordSampledPianoRef.current?.isReady())
      ) {
        return { ctx, instrument: refs.chordInstrumentRef.current };
      }

      refs.chordInstrumentRef.current?.stopAll(20);
      if (
        refs.chordInstrumentRef.current &&
        refs.chordInstrumentRef.current !== refs.chordSampledPianoRef.current
      ) {
        refs.chordInstrumentRef.current.disconnect();
      }

      if (chordSoundType === 'piano-sampled') {
        if (!refs.chordSampledPianoRef.current) {
          refs.chordSampledPianoRef.current = new SampledPiano(ctx);
        }
        try {
          refs.chordSampledPianoRef.current.disconnect();
        } catch {
          // Ignore disconnect errors when no active connections exist.
        }
        refs.chordSampledPianoRef.current.connect(ctx.destination);
        refs.chordSampledPianoRef.current.setLoadingProgressCallback(
          (loaded, total) => {
            setSampledPianoLoad({
              loading: loaded < total,
              loaded,
              total,
              ready: false,
            });
          }
        );
        if (!refs.chordSampledPianoRef.current.isReady()) {
          setSampledPianoLoad((previous) => ({ ...previous, loading: true }));
          await refs.chordSampledPianoRef.current.loadSamples();
        }
        setSampledPianoLoad((previous) => ({
          ...previous,
          loading: false,
          ready: refs.chordSampledPianoRef.current?.isReady() ?? false,
          loaded:
            previous.total > 0
              ? previous.total
              : refs.chordSampledPianoRef.current?.isReady()
                ? 1
                : 0,
          total: previous.total > 0 ? previous.total : 1,
        }));
        refs.chordInstrumentRef.current = refs.chordSampledPianoRef.current;
        refs.chordInstrumentTypeRef.current = chordSoundType;
        return { ctx, instrument: refs.chordSampledPianoRef.current };
      }
      const loadState = sampledPianoLoadRef.current;
      if (loadState.loading || loadState.ready || loadState.total > 0) {
        setSampledPianoLoad(IDLE_SAMPLED_PIANO_LOAD_STATE);
      }

      const instrument =
        chordSoundType === 'piano'
          ? new PianoSynthesizer(ctx)
          : new SimpleSynthesizer(ctx, chordSoundType as WaveformType);
      instrument.connect(ctx.destination);
      refs.chordInstrumentRef.current = instrument;
      refs.chordInstrumentTypeRef.current = chordSoundType;
      return { ctx, instrument };
    };

    const playChord = async () => {
      const ready = await ensureInstrument();
      if (!ready) return;
      const { ctx, instrument } = ready;
      const treble = generateVoicing(
        chord,
        {
          useInversions: false,
          useOpenVoicings: true,
          randomizeOctaves: false,
        },
        'treble'
      );
      const bass = generateVoicing(
        chord,
        {
          useInversions: false,
          useOpenVoicings: false,
          randomizeOctaves: false,
        },
        'bass'
      );
      const chordPitches = [
        ...new Set([...bass.slice(0, 1), ...treble.slice(0, 4)]),
      ];
      if (chordPitches.length === 0) return;

      const measure = parsedRhythm.measures[measureIndex];
      const measureSixteenths = measure
        ? measure.notes.reduce(
            (sum, note) => sum + note.durationInSixteenths,
            0
          )
        : 16;
      const measureSeconds = Math.max(
        0.18,
        (measureSixteenths / 4) * (60 / Math.max(1, bpm))
      );
      const beatsPerMeasure =
        timeSignature.numerator * (4 / timeSignature.denominator);
      const secPerBeat = measureSeconds / Math.max(0.001, beatsPerMeasure);
      const sectionStyle = chordStyleByMeasure.get(measureIndex) ?? 'simple';
      const patternHits = getChordHitsForStyle(sectionStyle, timeSignature);
      const velocity = effectiveChordVolume;
      const startTime = ctx.currentTime + 0.01;
      patternHits.forEach((hit) => {
        const hitPitches =
          hit.source === 'bass'
            ? bass.slice(0, 1)
            : hit.source === 'treble'
              ? treble.slice(0, 4)
              : chordPitches;
        const uniqueHitPitches = [...new Set(hitPitches)];
        const hitStart = startTime + hit.offsetBeats * secPerBeat;
        const hitDuration = Math.max(
          0.12,
          hit.durationBeats * secPerBeat * 0.95
        );
        uniqueHitPitches.forEach((midi) => {
          instrument.playNote({
            frequency: midiToFrequency(midi),
            startTime: hitStart,
            duration: hitDuration,
            velocity,
          });
        });
      });
    };

    void playChord();
    // Ref objects are stable; instrument state lives on refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlaying,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    currentMetronomeBeat,
    currentNote,
    parsedRhythm.measures,
    bpm,
    timeSignature,
    effectiveChordVolume,
    chordSoundType,
    sampledPianoLoad.loading,
    sampledPianoLoad.ready,
    sampledPianoLoad.total,
    setSampledPianoLoad,
  ]);
}
