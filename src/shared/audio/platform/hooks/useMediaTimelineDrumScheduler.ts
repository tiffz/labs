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

/**
 * DrumScheduler for media-slaved hosts (Stanza). Invokes DrumAccompaniment callback with
 * beat windows derived from media timeline + look-ahead.
 */
export function createMediaTimelineDrumScheduler(
  opts: MediaTimelineDrumSchedulerOptions,
): DrumScheduler {
  const player = createDrumAudioPlayer({ includeClick: false });
  let storedCallback: DrumSchedulerCallback | null = null;
  let raf = 0;
  let scheduledUpToBeat = -1;

  const clock = () =>
    new MediaTimelineClock({
      bpm: opts.bpm,
      timeSignature: opts.timeSignature,
      anchorMediaTime: opts.anchorMediaTime,
      getMediaTime: opts.getMediaTime,
    });

  const tick = () => {
    if (!storedCallback || !opts.isPlaying || !(opts.bpm > 0) || !Number.isFinite(opts.bpm)) {
      raf = 0;
      return;
    }
    void labsPlaybackSafeCallAsync('drum scheduler RAF tick', async () => {
      await player.ensureReady();
      const ctx = player.getAudioContext();
      if (!ctx || !storedCallback) return;

      labsPlaybackSafeCall('drum scheduler callback', () => {
        const mediaTime = opts.getMediaTime();
        const clockInstance = clock();
        const beatIndex = clockInstance.mediaTimeToBeatIndex(mediaTime);
        const beatStart = clockInstance.beatIndexToMediaTime(beatIndex);
        const period = 60 / opts.bpm;
        const frac = mediaTime - beatStart > 0 ? (mediaTime - beatStart) / period : 0;
        const currentBeat = beatIndex + frac;
        const lookAhead = 0.5;
        const startBeat = scheduledUpToBeat < 0 ? currentBeat : scheduledUpToBeat;
        const endBeat = currentBeat + lookAhead;

        if (endBeat > startBeat) {
          const startAudioTime = ctx.currentTime;
          const callback = storedCallback;
          if (callback) {
            callback(startBeat, endBeat, startAudioTime - currentBeat * period, opts.bpm, ctx);
            scheduledUpToBeat = endBeat;
          }
        }
      });
    });

    raf = window.requestAnimationFrame(tick);
  };

  return {
    loadSound: async (name, url) => {
      await player.ensureReady();
      const ctx = player.getAudioContext();
      if (!ctx) return;
      void name;
      void url;
      for (const [n, u] of Object.entries(DRUM_SAMPLE_URLS)) {
        await player.underlying.loadAdditionalSounds({ [n]: u });
      }
    },
    playAt: (soundName, audioTime, volume) => {
      player.playNowIfReady(soundName as never, volume, undefined, audioTime);
    },
    setCallback: (cb) => {
      storedCallback = cb;
      if (cb && opts.isPlaying) {
        scheduledUpToBeat = -1;
        if (!raf) raf = window.requestAnimationFrame(tick);
      } else {
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        scheduledUpToBeat = -1;
      }
    },
  };
}
