import type { DrumScheduler } from '../../../components/music/DrumAccompaniment';
import type { TimeSignature } from '../../../rhythm/types';
import { labsPlaybackSafeCall, labsPlaybackSafeCallAsync } from '../../../utils/labsPlaybackSafeCall';
import { createDrumAudioPlayer } from '../players/createDrumAudioPlayer';
import { MediaTimelineClock } from '../clocks';
import type { DrumSchedulerCallback } from '../scheduling/scheduleDrumPatternWindow';
import { DRUM_SAMPLE_URLS } from '../../drumSampleUrls';

export type MediaTimelineDrumSchedulerOptions = {
  bpm: number;
  timeSignature: TimeSignature;
  anchorMediaTime: number;
  getMediaTime: () => number;
  isPlaying: boolean;
};

/** Foreground horizon, in beats. rAF runs at ~60 Hz so this only has to survive a slow frame. */
const FOREGROUND_LOOK_AHEAD_BEATS = 0.5;

/**
 * Hidden-tab horizon, in SECONDS. A background tab pauses rAF entirely and throttles timers to
 * roughly 1 Hz, so a hidden tick has to schedule far enough ahead that audio never gaps before the
 * next wakeup. Matches `CHART_BACKGROUND_LOOK_AHEAD_SEC`.
 */
const BACKGROUND_LOOK_AHEAD_SEC = 4.0;

/** Timer cadence for the hidden-tab driver; the browser throttles this to ~1 Hz when hidden. */
const BACKGROUND_TICK_INTERVAL_MS = 500;

/**
 * DrumScheduler for media-slaved hosts (Stanza). Invokes DrumAccompaniment callback with
 * beat windows derived from media timeline + look-ahead.
 *
 * Keeps playing while the tab is hidden. Previously this was driven by `requestAnimationFrame`
 * alone, which a background tab pauses — so switching tabs silenced the drum layer while the
 * `<audio>` element carried on, and the two came back out of step. Putting on a practice track and
 * multitasking is a core use case, so a timer drives the hidden case with a wider horizon.
 */
export type MediaTimelineDrumScheduler = DrumScheduler & {
  /** Re-evaluate `opts.isPlaying` and start or stop the driver. Call after mutating `opts`. */
  syncPlayback(): void;
  /** Release the AudioContext and decoded samples. MUST be called on unmount. */
  destroy(): void;
};

export function createMediaTimelineDrumScheduler(
  opts: MediaTimelineDrumSchedulerOptions,
): MediaTimelineDrumScheduler {
  const player = createDrumAudioPlayer({ includeClick: false });
  let storedCallback: DrumSchedulerCallback | null = null;
  let raf = 0;
  let backgroundTimer = 0;
  let scheduledUpToBeat = -1;
  /** Resolves once every sample is decoded, so the tick never awaits a load. */
  let assetsReady: Promise<void> | null = null;

  const clock = () =>
    new MediaTimelineClock({
      bpm: opts.bpm,
      timeSignature: opts.timeSignature,
      anchorMediaTime: opts.anchorMediaTime,
      getMediaTime: opts.getMediaTime,
    });

  /**
   * Warm every sample once, up front.
   *
   * The tick used to `await player.ensureReady()` inline, which triggered a fetch + decode of every
   * sample on the first frame. Until those resolved, `playNowIfReady` dropped each hit silently and
   * `scheduledUpToBeat` advanced anyway — so the opening beats were lost with no retry. That is the
   * "drums are muted at the start" report.
   */
  const warmAssets = (): Promise<void> => {
    assetsReady ??= labsPlaybackSafeCallAsync('drum scheduler warm assets', async () => {
      await player.ensureReady();
      // One batch, not one call per sound. `loadSound` used to ignore its arguments and reload the
      // whole set, so N sounds meant N x N decodes.
      await player.underlying.loadAdditionalSounds({ ...DRUM_SAMPLE_URLS });
    }).then(() => undefined);
    return assetsReady;
  };

  const runTick = (): void => {
    if (!storedCallback || !opts.isPlaying || !(opts.bpm > 0) || !Number.isFinite(opts.bpm)) return;
    const ctx = player.getAudioContext();
    // Assets are warmed before the loop starts; if they are somehow not ready yet, skip this tick
    // WITHOUT advancing `scheduledUpToBeat`, so the beats are scheduled on a later tick instead of
    // being silently dropped.
    if (!ctx || !player.isReady()) return;

    labsPlaybackSafeCall('drum scheduler callback', () => {
      const mediaTime = opts.getMediaTime();
      const clockInstance = clock();
      const beatIndex = clockInstance.mediaTimeToBeatIndex(mediaTime);
      const beatStart = clockInstance.beatIndexToMediaTime(beatIndex);
      const period = 60 / opts.bpm;
      const frac = mediaTime - beatStart > 0 ? (mediaTime - beatStart) / period : 0;
      const currentBeat = beatIndex + frac;

      const hidden = typeof document !== 'undefined' && document.hidden;
      const lookAhead = hidden
        ? BACKGROUND_LOOK_AHEAD_SEC / period
        : FOREGROUND_LOOK_AHEAD_BEATS;

      const startBeat = scheduledUpToBeat < 0 ? currentBeat : scheduledUpToBeat;
      const endBeat = currentBeat + lookAhead;
      if (endBeat <= startBeat) return;

      const callback = storedCallback;
      if (!callback) return;
      callback(startBeat, endBeat, ctx.currentTime - currentBeat * period, opts.bpm, ctx);
      scheduledUpToBeat = endBeat;
    });
  };

  const rafTick = (): void => {
    if (!storedCallback || !opts.isPlaying) {
      raf = 0;
      return;
    }
    runTick();
    raf = window.requestAnimationFrame(rafTick);
  };

  const startDriver = (): void => {
    void warmAssets().then(() => {
      if (!storedCallback || !opts.isPlaying) return;
      if (!raf) raf = window.requestAnimationFrame(rafTick);
    });
    if (!backgroundTimer) {
      // Guarded to hidden so it never double-drives the foreground rAF loop.
      backgroundTimer = window.setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) return;
        runTick();
      }, BACKGROUND_TICK_INTERVAL_MS);
    }
  };

  const stopDriver = (): void => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    if (backgroundTimer) window.clearInterval(backgroundTimer);
    backgroundTimer = 0;
    scheduledUpToBeat = -1;
  };

  return {
    syncPlayback: () => {
      if (storedCallback && opts.isPlaying) startDriver();
      else stopDriver();
    },
    destroy: () => {
      storedCallback = null;
      stopDriver();
      player.destroy();
    },
    loadSound: async () => {
      // Every sample is warmed as one batch; per-sound calls are a no-op beyond that.
      await warmAssets();
    },
    playAt: (soundName, audioTime, volume) => {
      player.playNowIfReady(soundName as never, volume, undefined, audioTime);
    },
    setCallback: (cb) => {
      storedCallback = cb;
      if (cb && opts.isPlaying) {
        scheduledUpToBeat = -1;
        startDriver();
      } else {
        stopDriver();
      }
    },
  };
}
