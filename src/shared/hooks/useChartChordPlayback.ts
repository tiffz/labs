import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';
import {
  chartLayoutSectionPlayableSteps,
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
import {
  CHART_LOOK_AHEAD_SEC,
  LookAheadAudioScheduler,
} from '../audio/platform/scheduling/LookAheadAudioScheduler';
import { attachTransportVisibilityGuard } from '../audio/platform/scheduling/transportVisibility';
import { usePlaybackWakeLock } from '../audio/usePlaybackWakeLock';
import { ensureAudioContextRunning } from '../playback/audioContextLifecycle';
import {
  measureStartAudioTimeFromEpoch,
  PLAYBACK_SCHEDULE_LEAD_MS,
} from '../playback/measureClock';
import type { SampledPianoLoadState } from '../music/sampledPianoLoadState';
import { useSampledPianoPreload } from './useSampledPianoPreload';
import { createChartDrumAudioPlayer, scheduleDrumMeasure } from '../music/scheduleDrumMeasure';
import { scheduleStyledChordMeasure } from '../music/scheduleStyledChordMeasure';
import type { AudioPlayer } from '../audio/audioPlayer';
import type { Instrument } from '../playback/instruments';

/** Extra lead after assets are warm so the first measure is never scheduled late. */
const CHART_SCHEDULE_LEAD_MS = Math.max(PLAYBACK_SCHEDULE_LEAD_MS, 180);

/** Cap React beat-UI updates so VexFlow highlight work cannot starve the audio rAF tick. */
const BEAT_UI_MIN_INTERVAL_MS = 50;

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

  const transportRef = useRef<LookAheadAudioScheduler | null>(null);
  const stepIndexRef = useRef(0);
  const measureStartPerfRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const playbackGenerationRef = useRef(0);
  const loopPlaybackRef = useRef(false);
  const activeStepsRef = useRef<ChartPlaybackStep[]>([]);
  const instrumentSessionRef = useSampledPianoPreload(settings.soundType, setSampledPianoLoad);
  const drumPlayerRef = useRef<AudioPlayer | null>(null);
  const drumsReadyRef = useRef(false);
  const playingSectionIdRef = useRef<string | null>(null);
  const playbackEpochPerfRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sectionPlaybackOverridesRef = useRef(sectionPlaybackOverrides);
  sectionPlaybackOverridesRef.current = sectionPlaybackOverrides;
  const lastBeatUiPerfRef = useRef(0);

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

  const resetTransport = useCallback(() => {
    playbackGenerationRef.current += 1;
    transportRef.current?.stop();
    stepIndexRef.current = 0;
    instrumentSessionRef.current?.stopAll();
    drumPlayerRef.current?.stopAll();
  }, [instrumentSessionRef]);

  const stop = useCallback(() => {
    resetTransport();
    loopPlaybackRef.current = false;
    playingSectionIdRef.current = null;
    activeStepsRef.current = [];
    setPlaying(false);
    setPlayingSectionId(null);
    setPlaybackBeatTime(0);
    onActiveStepChange?.(null);
  }, [resetTransport, onActiveStepChange]);

  const ensureDrumPlayerReady = useCallback(async (): Promise<AudioPlayer | null> => {
    let drumPlayer = drumPlayerRef.current;
    if (!drumPlayer) {
      drumPlayer = createChartDrumAudioPlayer();
      drumPlayerRef.current = drumPlayer;
      drumsReadyRef.current = false;
    }
    if (!drumsReadyRef.current) {
      await drumPlayer.initialize();
      drumsReadyRef.current = true;
    }
    const resumed = await drumPlayer.ensureResumed();
    return resumed ? drumPlayer : null;
  }, []);

  /** Hot path: schedule one measure with already-warmed instruments (no awaits). */
  const scheduleMeasureSync = useCallback(
    (
      step: ChartPlaybackStep,
      stepIndex: number,
      generation: number,
      instrument: Instrument,
      chordCtx: AudioContext,
      drumPlayer: AudioPlayer | null,
    ) => {
      if (generation !== playbackGenerationRef.current) return;
      if (chordCtx.state !== 'running' || document.hidden) return;

      const currentSettings = settingsRef.current;
      const measureSettings = resolveSectionPlaybackSettings(
        currentSettings,
        sectionPlaybackOverridesRef.current,
        step.sectionId,
      );
      const measureMs = chartPlaybackMeasureDurationMs(tempo);
      const measureDurationSec = measureMs / 1000;
      const measureStartTime = measureStartAudioTimeFromEpoch(
        chordCtx,
        playbackEpochPerfRef.current,
        stepIndex,
        measureMs,
      );
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
      if (drumVolume > 0 && drumPlayer) {
        const drumCtx = drumPlayer.getAudioContext();
        if (!drumCtx || drumCtx.state !== 'running') return;
        scheduleDrumMeasure({
          drumPlayer,
          pattern: measureSettings.drumPattern,
          timeSignature: CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
          tempo,
          volume: drumVolume,
          measureStartTime: measureStartAudioTimeFromEpoch(
            drumCtx,
            playbackEpochPerfRef.current,
            stepIndex,
            measureMs,
          ),
        });
      }
    },
    [tempo],
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

      resetTransport();
      loopPlaybackRef.current = options.loop;
      playingSectionIdRef.current = options.sectionId;
      activeStepsRef.current = playSteps;
      setPlaying(true);
      setPlayingSectionId(options.sectionId);
      stepIndexRef.current = 0;

      const generation = playbackGenerationRef.current;
      const shouldContinueLoop = () =>
        loopPlaybackRef.current || playingSectionIdRef.current !== null;

      void (async () => {
        // Warm assets BEFORE the transport clock starts — async work inside the
        // look-ahead tick is the main cause of chord+drum stutter (late notes
        // clamp to "now" and sound like a pause/burst).
        const ready = await session.ensureInstrument(settingsRef.current.soundType);
        if (!ready || generation !== playbackGenerationRef.current) return;
        if (!(await ensureAudioContextRunning(ready.ctx))) return;
        if (generation !== playbackGenerationRef.current) return;

        // Warm drums before the clock starts whenever any measure may need them.
        const wantDrums =
          settingsRef.current.drumsEnabled ||
          Object.values(sectionPlaybackOverridesRef.current ?? {}).some(
            (override) => override.customPlayback === true && override.drumsEnabled === true,
          );
        let drumPlayer: AudioPlayer | null = null;
        if (wantDrums) {
          drumPlayer = await ensureDrumPlayerReady();
          if (generation !== playbackGenerationRef.current) return;
        }

        if (ready.ctx.state !== 'running' || document.hidden) return;

        playbackEpochPerfRef.current = performance.now() + CHART_SCHEDULE_LEAD_MS;
        const measureMs = chartPlaybackMeasureDurationMs(tempo);
        if (!transportRef.current) transportRef.current = new LookAheadAudioScheduler();
        const transport = transportRef.current;

        const runStep = (idx: number) => {
          const step = activeStepsRef.current[idx];
          if (!step) return;
          const stepStartPerfMs = playbackEpochPerfRef.current + idx * measureMs;
          transport.scheduleCallback(Math.max(0, stepStartPerfMs - performance.now()), () => {
            if (generation !== playbackGenerationRef.current) return;
            measureStartPerfRef.current = stepStartPerfMs;
            setPlaybackBeatTime(0);
            onActiveStepChange?.(step);
          });
          scheduleMeasureSync(step, idx, generation, ready.instrument, ready.ctx, drumPlayer);
        };

        // Continuous look-ahead: schedule every measure whose start falls inside
        // the horizon. On loop wrap, advance the epoch by the loop duration —
        // never re-anchor to "now" (that opens an audible gap every pass).
        let endStopQueued = false;
        transport.start(
          (horizonSec) => {
            if (generation !== playbackGenerationRef.current) return;
            const horizonMs = horizonSec * 1000;
            const currentSteps = activeStepsRef.current;
            if (currentSteps.length === 0) return;

            // Bound work per tick so a huge catch-up cannot block the main thread.
            let scheduledThisTick = 0;
            const maxPerTick = currentSteps.length + 2;

            while (scheduledThisTick < maxPerTick) {
              const idx = stepIndexRef.current;
              const boundaryPerfMs = playbackEpochPerfRef.current + idx * measureMs;
              if (boundaryPerfMs > horizonMs) return;

              if (idx >= currentSteps.length) {
                if (!shouldContinueLoop()) {
                  if (!endStopQueued) {
                    endStopQueued = true;
                    const delayMs = Math.max(0, boundaryPerfMs - performance.now());
                    transport.scheduleCallback(delayMs, () => {
                      if (generation !== playbackGenerationRef.current) return;
                      stop();
                    });
                  }
                  return;
                }
                // Seamless loop: slide epoch forward by one full pass.
                playbackEpochPerfRef.current += currentSteps.length * measureMs;
                stepIndexRef.current = 0;
                continue;
              }

              runStep(idx);
              stepIndexRef.current = idx + 1;
              scheduledThisTick += 1;
            }
          },
          { lookAheadSec: CHART_LOOK_AHEAD_SEC },
        );
      })();
    },
    [
      ensureDrumPlayerReady,
      instrumentSessionRef,
      onActiveStepChange,
      resetTransport,
      scheduleMeasureSync,
      stop,
      tempo,
    ],
  );

  const start = useCallback(() => {
    beginPlayback(steps, { loop: false, sectionId: null });
  }, [beginPlayback, steps]);

  const startSectionLoop = useCallback(
    (sectionId: string) => {
      const sectionSteps = chartLayoutSectionPlayableSteps(layout, sectionId);
      beginPlayback(sectionSteps, { loop: true, sectionId });
    },
    [beginPlayback, layout],
  );

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      lastBeatUiPerfRef.current = 0;
      return;
    }

    const measureDurationSec = chartPlaybackMeasureDurationMs(tempo) / 1000;

    const tick = () => {
      const now = performance.now();
      const elapsedSec = (now - measureStartPerfRef.current) / 1000;
      const nextBeatTime = Math.min(elapsedSec, measureDurationSec);
      // Throttle React state — drum notation highlight must not run every frame.
      if (now - lastBeatUiPerfRef.current >= BEAT_UI_MIN_INTERVAL_MS) {
        lastBeatUiPerfRef.current = now;
        setPlaybackBeatTime(nextBeatTime);
      }
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
      transportRef.current?.stop();
      instrumentSessionRef.current?.stopAll();
      drumPlayerRef.current?.stopAll();
      instrumentSessionRef.current?.dispose();
      instrumentSessionRef.current = null;
      drumPlayerRef.current?.destroy();
      drumPlayerRef.current = null;
      drumsReadyRef.current = false;
    };
  }, [instrumentSessionRef]);

  /** Flush voices on tab hide; re-anchor epoch on show so overdue notes never pile up. */
  useEffect(() => {
    if (!playing) return;

    const flushVoices = () => {
      // Invalidate in-flight prepare/schedule promises before silencing.
      playbackGenerationRef.current += 1;
      transportRef.current?.stop();
      instrumentSessionRef.current?.stopAll();
      drumPlayerRef.current?.stopAll();
    };

    const resumeFromCurrentStep = () => {
      const playSteps = activeStepsRef.current;
      if (playSteps.length === 0) return;
      const sectionId = playingSectionIdRef.current;
      const loop = loopPlaybackRef.current || sectionId !== null;
      const idx = stepIndexRef.current;
      // Rebuild with a fresh epoch — never replay notes that piled up while suspended.
      const resumeSteps =
        idx >= playSteps.length ? playSteps : playSteps.slice(Math.min(idx, playSteps.length - 1));
      if (resumeSteps.length === 0) return;
      beginPlayback(resumeSteps, { loop, sectionId });
    };

    return attachTransportVisibilityGuard({
      onHidden: flushVoices,
      onVisible: resumeFromCurrentStep,
    });
    // Refs are stable; beginPlayback/playing gate attach + resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instrumentSessionRef
  }, [playing, beginPlayback]);

  usePlaybackWakeLock(playing);

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
