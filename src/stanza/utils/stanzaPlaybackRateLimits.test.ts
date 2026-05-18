import { describe, expect, it } from 'vitest';
import {
  clampStanzaPlaybackRate,
  formatStanzaPlaybackRateLabel,
  STANZA_RATE_MAX,
  STANZA_RATE_MIN,
  STANZA_RATE_STEP,
  STANZA_SPEED_MENU_PRESETS,
} from './stanzaPlaybackRateLimits';

describe('clampStanzaPlaybackRate', () => {
  it('clamps below the floor and above the ceiling', () => {
    expect(clampStanzaPlaybackRate(0.1)).toBe(STANZA_RATE_MIN);
    expect(clampStanzaPlaybackRate(5)).toBe(STANZA_RATE_MAX);
  });

  it('passes through in-range values unchanged', () => {
    expect(clampStanzaPlaybackRate(1)).toBe(1);
    expect(clampStanzaPlaybackRate(0.85)).toBe(0.85);
  });
});

describe('formatStanzaPlaybackRateLabel', () => {
  it('rounds to two decimals and suffixes with ×', () => {
    expect(formatStanzaPlaybackRateLabel(1)).toBe('1×');
    expect(formatStanzaPlaybackRateLabel(0.9499999)).toBe('0.95×');
  });
});

describe('STANZA_SPEED_MENU_PRESETS density (denser near 1×)', () => {
  it('lies fully within the slider range', () => {
    for (const p of STANZA_SPEED_MENU_PRESETS) {
      expect(p).toBeGreaterThanOrEqual(STANZA_RATE_MIN);
      expect(p).toBeLessThanOrEqual(STANZA_RATE_MAX);
    }
  });

  it('is sorted ascending with no duplicates', () => {
    for (let i = 1; i < STANZA_SPEED_MENU_PRESETS.length; i++) {
      expect(STANZA_SPEED_MENU_PRESETS[i]).toBeGreaterThan(STANZA_SPEED_MENU_PRESETS[i - 1]!);
    }
  });

  it('every value snaps to the STANZA_RATE_STEP grid (no chips the slider cannot exactly select)', () => {
    for (const p of STANZA_SPEED_MENU_PRESETS) {
      const ticks = Math.round(p / STANZA_RATE_STEP);
      expect(Math.abs(ticks * STANZA_RATE_STEP - p)).toBeLessThan(1e-9);
    }
  });

  it('includes 1× as the anchor', () => {
    expect(STANZA_SPEED_MENU_PRESETS).toContain(1);
  });

  it('includes the common micro-tuning speeds 0.95 / 0.9 / 0.85 and the symmetric 1.05 / 1.1', () => {
    for (const v of [0.85, 0.9, 0.95, 1.05, 1.1]) {
      expect(STANZA_SPEED_MENU_PRESETS).toContain(v);
    }
  });

  it('gaps between adjacent presets shrink monotonically as values approach 1× on both sides', () => {
    const presets = [...STANZA_SPEED_MENU_PRESETS];
    const oneIdx = presets.indexOf(1);
    expect(oneIdx).toBeGreaterThan(0);

    // Below 1×: walk inward toward 1. The gap to the *next-higher* preset must not exceed the
    // gap below it. (`prevGap >= nextGap`, with a tolerance for float rounding.)
    for (let i = 0; i < oneIdx - 1; i++) {
      const prevGap = presets[i + 1]! - presets[i]!;
      const nextGap = presets[i + 2]! - presets[i + 1]!;
      expect(prevGap + 1e-9).toBeGreaterThanOrEqual(nextGap);
    }

    // Above 1×: walk outward from 1. The gap to the *next* preset must not decrease.
    for (let i = oneIdx; i < presets.length - 2; i++) {
      const prevGap = presets[i + 1]! - presets[i]!;
      const nextGap = presets[i + 2]! - presets[i + 1]!;
      expect(nextGap + 1e-9).toBeGreaterThanOrEqual(prevGap);
    }
  });
});
