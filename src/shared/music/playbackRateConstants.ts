/** Local audio/video element and YouTube embed (YouTube may snap to nearest supported rate). */
export const DEFAULT_PLAYBACK_RATE_MIN = 0.25;
export const DEFAULT_PLAYBACK_RATE_MAX = 2;
export const DEFAULT_PLAYBACK_RATE_STEP = 0.05;

/** Preset chips in the speed menu — denser near 1× for practice tweaks. */
export const DEFAULT_SPEED_MENU_PRESETS = [
  0.25, 0.5, 0.75, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.25, 1.5, 1.75, 2,
] as const;

export function clampPlaybackRate(
  rate: number,
  min: number = DEFAULT_PLAYBACK_RATE_MIN,
  max: number = DEFAULT_PLAYBACK_RATE_MAX,
  step: number = DEFAULT_PLAYBACK_RATE_STEP,
): number {
  if (!Number.isFinite(rate)) return 1;
  const snapped = Math.round(rate / step) * step;
  const clamped = Math.min(max, Math.max(min, snapped));
  return Math.round(clamped * 100) / 100;
}

export function formatPlaybackRateLabel(rate: number): string {
  const r = Math.round(rate * 100) / 100;
  return `${r}×`;
}

export function formatPlaybackRateDraft(rate: number): string {
  const r = Math.round(rate * 100) / 100;
  return String(r);
}
