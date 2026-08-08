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
  CHART_BACKGROUND_LOOK_AHEAD_SEC,
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
import { createChartDrumAudioPlayer } from '../music/scheduleDrumMeasure';
import { scheduleChartMeasure } from '../music/scheduleChartMeasure';
import {
  useMetronomePreferences,
  type MetronomePreferences,
} from '../audio/platform/metronome';
import {
  GridMetronomeScheduler,
  type GridMetronomePlaybackPrefs,
} from '../audio/metronome/gridMetronomePlayback';
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
  /** Shared metronome preferences (subdivision, voice/click/drum sources, levels). */
  metronomePreferences: MetronomePreferences;
  setMetronomePreferences: (next: MetronomePreferences) => void;
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

  // Shared metronome: same engine, appearance, and preferences as the other apps
  // (drums/words/…). It rides the SINGLE chart transport (ADR 0025) — the grid
  // scheduler polls the same AudioContext the chords/drums use, so clicks stay in sync
  // and every advanced setting (subdivision / voice / click / drum) is live.
  const { preferences: metronomePreferences, setPreferences: setMetronomePreferences } =
    useMetronomePreferences({
      storageKey: `${storageKey}:metronome`,
      timeSignature: CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
    });
  const metronomePrefsRef = useRef(metronomePreferences);
  metronomePrefsRef.current = metronomePreferences;
  const metronomeSchedulerRef = useRef<GridMetronomeScheduler | null>(null);
  /** AudioContext time of beat 0 (the first measure's start) for the current play. */
  const metronomeAnchorAudioTimeRef = useRef(0);

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
    metronomeSchedulerRef.current?.reset();
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

  const ensureDrumPlayerReady = useCallback(
    async (sharedContext: AudioContext): Promise<AudioPlayer | null> => {
      let drumPlayer = drumPlayerRef.current;
      // The chord session (and its context) can be recreated between plays. Rebuild the
      // drum player on the current context so both always share one clock (ADR 0025).
      if (drumPlayer && drumPlayer.getAudioContext() !== null && drumPlayer.getAudioContext() !== sharedContext) {
        drumPlayer.destroy();
        drumPlayer = null;
        drumPlayerRef.current = null;
        drumsReadyRef.current = false;
      }
      if (!drumPlayer) {
        drumPlayer = createChartDrumAudioPlayer(sharedContext);
        drumPlayerRef.current = drumPlayer;
        drumsReadyRef.current = false;
      }
      if (!drumsReadyRef.current) {
        await drumPlayer.initialize();
        drumsReadyRef.current = true;
      }
      const resumed = await drumPlayer.ensureResumed();
      return resumed ? drumPlayer : null;
    },
    [],
  );

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
      // A suspended context (state !== 'running') is skipped; on resume the epoch is
      // re-anchored so we never map onto a frozen clock. Hidden alone no longer stops
      // scheduling — background playback keeps going (ADR 0025).
      if (chordCtx.state !== 'running') return;

      const currentSettings = settingsRef.current;
      const measureSettings = resolveSectionPlaybackSettings(
        currentSettings,
        sectionPlaybackOverridesRef.current,
        step.sectionId,
      );
      const measureMs = chartPlaybackMeasureDurationMs(tempo);
      const measureDurationSec = measureMs / 1000;
      // One clock, one measure start for chord AND drum (ADR 0025) — the drum player
      // borrows this same context, so there is no separate drum clock and no clamp.
      const measureStartTime = measureStartAudioTimeFromEpoch(
        chordCtx,
        playbackEpochPerfRef.current,
        stepIndex,
        measureMs,
      );

      // Metronome no longer rides the per-measure chord path — the shared grid
      // scheduler polls the same AudioContext in the rAF tick (see the beat-UI effect),
      // so subdivisions between measure boundaries schedule correctly.
      scheduleChartMeasure({
        ctx: chordCtx,
        measureStartTime,
        instrument,
        chordSymbol: step.chordName,
        chordStyleId: measureSettings.chordStyleId,
        chordVelocity: effectiveChordPlaybackVelocity(measureSettings),
        measureDurationSec,
        timeSignature: CHART_CHORD_PLAYBACK_TIME_SIGNATURE,
        drumPlayer,
        drumPattern: measureSettings.drumPattern,
        drumVolume: effectiveDrumPlaybackVolume(measureSettings),
        tempo,
        shouldContinue: () => generation === playbackGenerationRef.current,
      });
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
          // Share the chord session's context so drums and chords ride one clock (ADR 0025).
          drumPlayer = await ensureDrumPlayerReady(ready.ctx);
          if (generation !== playbackGenerationRef.current) return;
        }

        if (ready.ctx.state !== 'running') return;

        playbackEpochPerfRef.current = performance.now() + CHART_SCHEDULE_LEAD_MS;
        const measureMs = chartPlaybackMeasureDurationMs(tempo);
        // Anchor the metronome grid to beat 0 (the first measure's start) on the shared
        // clock, then reset the scheduler so it counts from that anchor.
        metronomeAnchorAudioTimeRef.current = measureStartAudioTimeFromEpoch(
          ready.ctx,
          playbackEpochPerfRef.current,
          0,
          measureMs,
        );
        if (!metronomeSchedulerRef.current) metronomeSchedulerRef.current = new GridMetronomeScheduler();
        metronomeSchedulerRef.current.reset();
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

            // Bound work per tick so a huge catch-up cannot block the main thread,
            // yet still cover the full horizon (a wide background horizon may span
            // several passes of a short section).
            let scheduledThisTick = 0;
            const maxPerTick = Math.ceil(horizonMs / measureMs) + 2;

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
                // Wrap-time voice choke (ADR 0025 step 3): cut the previous pass's
                // still-ringing voices AT the loop boundary on the audio clock, BEFORE
                // scheduling the next pass, so voices can't accumulate across wraps —
                // bounded no matter how far ahead the horizon scheduled.
                const wrapBoundaryAudioTime = measureStartAudioTimeFromEpoch(
                  ready.ctx,
                  playbackEpochPerfRef.current,
                  currentSteps.length,
                  measureMs,
                );
                ready.instrument.stopAllVoicesAt?.(wrapBoundaryAudioTime);
                drumPlayer?.stopAllSounds(wrapBoundaryAudioTime);
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
          {
            lookAheadSec: CHART_LOOK_AHEAD_SEC,
            // Keep scheduling while hidden with a wider horizon (rAF pauses in
            // background tabs; a ~1 Hz timer drives it). Safe because the single late
            // gate drops any overdue backlog instead of blasting it (ADR 0025).
            backgroundLookAheadSec: CHART_BACKGROUND_LOOK_AHEAD_SEC,
          },
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
    beginPlayback(steps, { loop: settingsRef.current.loopWholeSong, sectionId: null });
  }, [beginPlayback, steps]);

  // Toggling "Loop song" mid-play takes effect at the next wrap. Only full-song
  // playback reads this ref; section loops set loop=true on their own (sectionId).
  useEffect(() => {
    if (playing && playingSectionId === null) {
      loopPlaybackRef.current = settings.loopWholeSong;
    }
  }, [playing, playingSectionId, settings.loopWholeSong]);

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

      // Metronome look-ahead poll on the SAME AudioContext as chords/drums (ADR 0025),
      // so clicks stay locked to the chord grid and honor every live preference. The
      // grid scheduler dedupes slots, so polling every frame is safe.
      if (settingsRef.current.metronomeEnabled) {
        const ctx = instrumentSessionRef.current?.getAudioContext();
        const scheduler = metronomeSchedulerRef.current;
        if (ctx && ctx.state === 'running' && scheduler) {
          const prefs = metronomePrefsRef.current as GridMetronomePlaybackPrefs;
          scheduler.configure(tempo, CHART_CHORD_PLAYBACK_TIME_SIGNATURE, prefs, 0);
          const elapsed = ctx.currentTime - metronomeAnchorAudioTimeRef.current;
          const masterVolume = prefs.masterMuted ? 0 : prefs.masterVolume;
          void scheduler.pollTimeline(ctx, elapsed, prefs, masterVolume, 0.03);
        }
      }

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
    // instrumentSessionRef/metronome refs are stable; only playing/tempo gate this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instrumentSessionRef
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

  /**
   * Background playback (ADR 0025): hidden ≠ stop. The transport keeps scheduling
   * while the tab is hidden, and the single late gate drops any overdue backlog if
   * the clock froze — so there is no resume blast to flush. We only touch the epoch
   * when the context ACTUALLY suspended, re-anchoring it to continue from the current
   * measure (the frozen backlog was already skipped, not replayed).
   */
  useEffect(() => {
    if (!playing) return;

    const reanchorIfSuspended = () => {
      const ctx = instrumentSessionRef.current?.getAudioContext();
      if (!ctx || ctx.state === 'running') return; // seamless — clock never froze
      void ensureAudioContextRunning(ctx).then((running) => {
        if (!running) return;
        const measureMs = chartPlaybackMeasureDurationMs(tempo);
        // Continue from the current measure: set the epoch so boundary(stepIndex)
        // lands at now + lead. Overdue measures were skipped by the late gate.
        playbackEpochPerfRef.current =
          performance.now() + CHART_SCHEDULE_LEAD_MS - stepIndexRef.current * measureMs;
      });
    };

    return attachTransportVisibilityGuard({
      onHidden: () => {
        // Keep scheduling — background playback continues.
      },
      onVisible: reanchorIfSuspended,
    });
    // Refs are stable; only playing/tempo gate the attach + re-anchor math.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instrumentSessionRef
  }, [playing, tempo]);

  usePlaybackWakeLock(playing);

  return {
    playing,
    canPlay: steps.length > 0,
    playingSectionId,
    settings,
    updateSettings,
    metronomePreferences,
    setMetronomePreferences,
    start,
    startSectionLoop,
    stop,
    sampledPianoLoad,
    playbackBeatTime,
    playbackBeat,
  };
}
