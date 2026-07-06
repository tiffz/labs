import { describe, expect, it } from 'vitest';
import {
  COUNT_METRONOME_DEFAULTS,
  PLAYBACK_APP_METRONOME_DEFAULTS,
  decodeMetronomePreferences,
  defaultMetronomePreferences,
  encodeMetronomePreferences,
  getPlaybackAppDefaultSubdivisionLevel,
  isMetronomeNonDefault,
} from './preferences';

describe('metronome preferences', () => {
  const ts = { numerator: 4, denominator: 4 };

  it('round-trips through codec', () => {
    const prefs = defaultMetronomePreferences(ts, PLAYBACK_APP_METRONOME_DEFAULTS);
    const encoded = encodeMetronomePreferences(prefs);
    const decoded = decodeMetronomePreferences(encoded, prefs);
    expect(decoded).toEqual(prefs);
  });

  it('detects non-default prefs', () => {
    const baseline = defaultMetronomePreferences(ts, PLAYBACK_APP_METRONOME_DEFAULTS);
    const changed = { ...baseline, subdivisionLevel: 4 as const };
    expect(isMetronomeNonDefault(baseline, baseline)).toBe(false);
    expect(isMetronomeNonDefault(changed, baseline)).toBe(true);
  });

  it('applies Count defaults separately from playback apps', () => {
    const count = defaultMetronomePreferences(ts, COUNT_METRONOME_DEFAULTS);
    const playback = defaultMetronomePreferences(ts, {
      ...PLAYBACK_APP_METRONOME_DEFAULTS,
      subdivisionLevel: getPlaybackAppDefaultSubdivisionLevel(ts),
    });
    expect(count.sourceEnabled.voice).toBe(true);
    expect(playback.sourceEnabled.voice).toBe(false);
    expect(playback.subdivisionLevel).toBe(1);
  });

  it('playback apps default to beat-level subdivisions in /4', () => {
    expect(getPlaybackAppDefaultSubdivisionLevel({ numerator: 4, denominator: 4 })).toBe(1);
    expect(getPlaybackAppDefaultSubdivisionLevel({ numerator: 6, denominator: 8 })).toBe(2);
  });
});
