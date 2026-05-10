/** YouTube embed and local audio: stay within a conservative range. */
export const STANZA_RATE_MIN = 0.25;
export const STANZA_RATE_MAX = 2;
export const STANZA_RATE_STEP = 0.05;

/** Menu presets (subset of [min, max] with common practice values). */
export const STANZA_SPEED_MENU_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export function clampStanzaPlaybackRate(rate: number): number {
  return Math.min(STANZA_RATE_MAX, Math.max(STANZA_RATE_MIN, rate));
}

export function formatStanzaPlaybackRateLabel(rate: number): string {
  const r = Math.round(rate * 100) / 100;
  return `${r}×`;
}
