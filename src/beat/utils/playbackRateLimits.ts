import {
  clampPlaybackRate,
  DEFAULT_PLAYBACK_RATE_MAX,
  DEFAULT_PLAYBACK_RATE_MIN,
  DEFAULT_PLAYBACK_RATE_STEP,
  DEFAULT_SPEED_MENU_PRESETS,
  formatPlaybackRateLabel,
} from '../../shared/music/playbackRateConstants';

/** Local audio/video element and YouTube embed (YouTube snaps to nearest supported rate). */
export const BEAT_RATE_MIN = DEFAULT_PLAYBACK_RATE_MIN;
export const BEAT_RATE_MAX = DEFAULT_PLAYBACK_RATE_MAX;
export const BEAT_RATE_STEP = DEFAULT_PLAYBACK_RATE_STEP;
export const BEAT_SPEED_MENU_PRESETS = DEFAULT_SPEED_MENU_PRESETS;

export const clampBeatPlaybackRate = clampPlaybackRate;
export const formatBeatPlaybackRateLabel = formatPlaybackRateLabel;

/** YouTube IFrame API commonly accepts quarter-step rates in this band. */
const YOUTUBE_RATE_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export function snapYouTubePlaybackRate(rate: number): number {
  const clamped = clampBeatPlaybackRate(rate);
  let best: number = YOUTUBE_RATE_STEPS[0];
  let bestDist = Infinity;
  for (const step of YOUTUBE_RATE_STEPS) {
    const dist = Math.abs(step - clamped);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
}
