/** YouTube embed and local audio: stay within a conservative range. */
export const STANZA_RATE_MIN = 0.25;
export const STANZA_RATE_MAX = 2;
export const STANZA_RATE_STEP = 0.05;

/**
 * Speed-menu preset chips, ordered ascending. Hand-picked for **practice ergonomics**: gaps
 * are intentionally **denser near 1×** (where singers and instrumentalists actually fine-tune
 * difficult passages — 0.95, 0.9, 0.85 are some of the most common "shave a hair off" speeds)
 * and **looser at the extremes** (very-slow note isolation and faster-than-original prep don't
 * benefit from fine-grained chips because the slider and custom-value field cover those cases).
 *
 * Spacing pattern (each step from 1× outward):
 *   1×, ±0.05, ±0.10, ±0.15, ±0.25, ±0.50, ±0.75 (− side only), ±1.00.
 *
 * Tests in `stanzaPlaybackRateLimits.test.ts` lock in the invariants — all values must lie in
 * `[STANZA_RATE_MIN, STANZA_RATE_MAX]`, snap to the `STANZA_RATE_STEP` grid, include the user-
 * requested {0.85, 0.9, 0.95, 1, 1.05, 1.1}, and gaps must shrink monotonically toward 1× on
 * both sides — so changes to this list have to consciously preserve the density profile.
 */
export const STANZA_SPEED_MENU_PRESETS = [
  0.25, 0.5, 0.75, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.25, 1.5, 1.75, 2,
] as const;

export function clampStanzaPlaybackRate(rate: number): number {
  return Math.min(STANZA_RATE_MAX, Math.max(STANZA_RATE_MIN, rate));
}

export function formatStanzaPlaybackRateLabel(rate: number): string {
  const r = Math.round(rate * 100) / 100;
  return `${r}×`;
}
