import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';
import {
  chartLayoutToPlayablePlaybackSteps,
  chartPlaybackMeasureDurationMs,
  type ChartPlaybackStep,
} from '../music/chordPro/chartPlaybackSequence';
import {
  CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
  effectiveChordPlaybackVelocity,
  effectiveDrumPlaybackVolume,
  loadChordPlaybackSettings,
  saveChordPlaybackSettings,
  type ChordPlaybackSettings,
} from '../music/chordPlaybackSettings';
import { resolveSectionPlaybackSettings, type SectionPlaybackOverride } from '../music/resolveSectionPlaybackSettings';
import { CHART_PLAYBACK_BEATS_PER_MEASURE } from '../music/chordPro/chartPlaybackSequence';
import { ChordInstrumentSession } from '../music/chordInstrumentSession';
import { ensureAudioContextRunning } from '../playback/audioContextLifecycle';
import type { SampledPianoLoadState } from '../music/sampledPianoLoadState';
import { useSampledPianoPreload } from './useSampledPianoPreload';
import { createChartDrumAudioPlayer, scheduleDrumMeasure } from '../music/scheduleDrumMeasure';
import { scheduleStyledChordMeasure } from '../music/scheduleStyledChordMeasure';
import type { AudioPlayer } from '../audio/audioPlayer';

export type UseChartChordPlaybackOptions = {
  layout: ChartLayout;
  tempo: number;
  storageKey: string;
  sectionPlaybackOverrides?: Record<string, SectionPlaybackOverride>;
  onActiveStepChange?: (step: ChartPlaybackStep | null) => void;
};

export type UseChartChordPlaybackResult = {
  playing: boolean;
  canPlay: boolean;
  /** Section id when looping a single section; null for full-chart playback. */
  playingSectionId: string | null;
  settings: ChordPlaybackSettings;
  updateSettings: (patch: Partial<ChordPlaybackSettings>) => void;
  start: () => void;
  startSectionLoop: (sectionId: string) => void;
  stop: () => void;
  sampledPianoLoad: SampledPianoLoadState;
  /** Seconds elapsed within the current chart measure (for drum notation sync). */
  playbackBeatTime: number;
  /** Beat index within the current measure (0-based). */
  playbackBeat: number;
};

export function useChartChordPlayback({
  layout,
  tempo,
  storageKey,
  sectionPlaybackOverrides,
  onActiveStepChange,
}: UseChartChordPlaybackOptions): UseChartChordPlaybackResult {
  const [settings, setSettings] = useState<ChordPlaybackSettings>(() =>
    loadChordPlaybackSettings(storageKey),
  );
  const [playing, setPlaying] = useState(false);
  const [playingSectionId, setPlayingSectionId] = useState<string | null>(null);
  const [playbackBeatTime, setPlaybackBeatTime] = useState(0);
  const [sampledPianoLoad, setSampledPianoLoad] = useState<SampledPianoLoadState>({
    loading: false,
    loaded: 0,
    total: 0,
    ready: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIndexRef = useRef(0);
  const measureStartPerfRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const playbackGenerationRef = useRef(0);
  const loopPlaybackRef = useRef(false);
  const activeStepsRef = useRef<ChartPlaybackStep[]>([]);
  const instrumentSessionRef = useSampledPianoPreload(settings.soundType, setSampledPianoLoad);
  const drumPlayerRef = useRef<AudioPlayer | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sectionPlaybackOverridesRef = useRef(sectionPlaybackOverrides);
  sectionPlaybackOverridesRef.current = sectionPlaybackOverrides;

  const steps = useMemo(() => chartLayoutToPlayablePlaybackSteps(layout), [layout]);

  const updateSettings = useCallback(
    (patch: Partial<ChordPlaybackSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveChordPlaybackSettings(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const stop = useCallback(() => {
    playbackGenerationRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stepIndexRef.current = 0;
    loopPlaybackRef.current = false;
    activeStepsRef.current = [];
    instrumentSessionRef.current?.stopAll();
    drumPlayerRef.current?.stopAll();
    setPlaying(false);
    setPlayingSectionId(null);
    setPlaybackBeatTime(0);
    onActiveStepChange?.(null);
  }, [instrumentSessionRef, onActiveStepChange]);

  const playMeasure = useCallback(
    async (step: ChartPlaybackStep, generation: number) => {
      if (generation !== playbackGenerationRef.current) return;

      let session = instrumentSessionRef.current;
      if (!session || session.isDisposed()) {
        session = new ChordInstrumentSession();
        instrumentSessionRef.current = session;
      }
      session.setSampleLoadListener(setSampledPianoLoad);

      const currentSettings = settingsRef.current;
      const measureSettings = resolveSectionPlaybackSettings(
        currentSettings,
        sectionPlaybackOverridesRef.current,
        step.sectionId,
      );
      const ready = await session.ensureInstrument(currentSettings.soundType);
      if (!ready || generation !== playbackGenerationRef.current) return;

      const { ctx, instrument } = ready;
      if (!(await ensureAudioContextRunning(ctx))) return;
      if (generation !== playbackGenerationRef.current) return;

      const measureMs = chartPlaybackMeasureDurationMs(tempo);
      const measureDurationSec = measureMs / 1000;
      const measureStartTime = ctx.currentTime + 0.02;
      const chordVelocity = effectiveChordPlaybackVelocity(measureSettings);

      scheduleStyledChordMeasure({
        symbol: step.chordName,
        styleId: measureSettings.chordStyleId,
        instrument,
        measureStartTime,
        measureDurationSec,
        timeSignature: CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
        velocity: chordVelocity,
      });

      if (generation !== playbackGenerationRef.current) {
        instrument.stopAll(0);
        return;
      }

      const drumVolume = effectiveDrumPlaybackVolume(measureSettings);
      if (drumVolume > 0) {
        let drumPlayer = drumPlayerRef.current;
        if (!drumPlayer) {
          drumPlayer = createChartDrumAudioPlayer();
          drumPlayerRef.current = drumPlayer;
          await drumPlayer.initialize();
        }
        if (generation !== playbackGenerationRef.current) return;
        await drumPlayer.ensureResumed();
        if (generation !== playbackGenerationRef.current) return;
        scheduleDrumMeasure({
          drumPlayer,
          pattern: measureSettings.drumPattern,
          timeSignature: CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
          tempo,
          volume: drumVolume,
        });
      }
    },
    [instrumentSessionRef, tempo],
  );

  const beginPlayback = useCallback(
    (playSteps: ChartPlaybackStep[], options: { loop: boolean; sectionId: string | null }) => {
      if (playSteps.length === 0) return;

      let session = instrumentSessionRef.current;
      if (!session || session.isDisposed()) {
        session = new ChordInstrumentSession();
        instrumentSessionRef.current = session;
      }
      // Resume chord AudioContext synchronously while the click gesture is still active.
      session.primeAudioContext();

      stop();
      loopPlaybackRef.current = options.loop;
      activeStepsRef.current = playSteps;
      setPlaying(true);
      setPlayingSectionId(options.sectionId);
      stepIndexRef.current = 0;

      const runStep = (idx: number) => {
        const step = activeStepsRef.current[idx];
        if (!step) return;
        const generation = playbackGenerationRef.current;
        measureStartPerfRef.current = performance.now();
        setPlaybackBeatTime(0);
        onActiveStepChange?.(step);
        void playMeasure(step, generation);
      };

      runStep(0);
      stepIndexRef.current = 1;
      timerRef.current = setInterval(() => {
        const idx = stepIndexRef.current;
        const currentSteps = activeStepsRef.current;
        if (idx >= currentSteps.length) {
          if (loopPlaybackRef.current) {
            stepIndexRef.current = 0;
            runStep(0);
            stepIndexRef.current = 1;
            return;
          }
          stop();
          return;
        }
        runStep(idx);
        stepIndexRef.current += 1;
      }, chartPlaybackMeasureDurationMs(tempo));
    },
    [instrumentSessionRef, onActiveStepChange, playMeasure, stop, tempo],
  );

  const start = useCallback(() => {
    beginPlayback(steps, { loop: false, sectionId: null });
  }, [beginPlayback, steps]);

  const startSectionLoop = useCallback(
    (sectionId: string) => {
      const sectionSteps = steps.filter((step) => step.sectionId === sectionId);
      beginPlayback(sectionSteps, { loop: true, sectionId });
    },
    [beginPlayback, steps],
  );

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      return;
    }

    const measureDurationSec = chartPlaybackMeasureDurationMs(tempo) / 1000;

    const tick = () => {
      const elapsedSec = (performance.now() - measureStartPerfRef.current) / 1000;
      setPlaybackBeatTime(Math.min(elapsedSec, measureDurationSec));
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    };
  }, [playing, tempo]);

  const playbackBeat = useMemo(() => {
    if (!playing) return 0;
    const secPerBeat = 60 / tempo;
    return Math.floor(playbackBeatTime / secPerBeat) % CHART_PLAYBACK_BEATS_PER_MEASURE;
  }, [playing, playbackBeatTime, tempo]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      instrumentSessionRef.current?.stopAll();
      drumPlayerRef.current?.stopAll();
      instrumentSessionRef.current?.dispose();
      instrumentSessionRef.current = null;
      drumPlayerRef.current?.destroy();
      drumPlayerRef.current = null;
    };
  }, [instrumentSessionRef]);

  return {
    playing,
    canPlay: steps.length > 0,
    playingSectionId,
    settings,
    updateSettings,
    start,
    startSectionLoop,
    stop,
    sampledPianoLoad,
    playbackBeatTime,
    playbackBeat,
  };
}
