import { afterEach, describe, expect, it } from 'vitest';
import { chordSymbolToTheoryChord } from './chordSymbolToTheoryChord';
import {
  DEFAULT_CHORD_PLAYBACK_SETTINGS,
  effectiveChordPlaybackVelocity,
  effectiveDrumPlaybackVolume,
  loadChordPlaybackSettings,
  saveChordPlaybackSettings,
} from './chordPlaybackSettings';

describe('chordSymbolToTheoryChord', () => {
  it('maps common symbols to voicing input', () => {
    expect(chordSymbolToTheoryChord('Fm')).toEqual({
      root: 'F',
      quality: 'minor',
      inversion: 0,
      octave: 4,
    });
    expect(chordSymbolToTheoryChord('Bbmaj7')).toEqual({
      root: 'Bb',
      quality: 'major7',
      inversion: 0,
      octave: 4,
    });
  });

  it('returns null for invalid symbols', () => {
    expect(chordSymbolToTheoryChord('')).toBeNull();
    expect(chordSymbolToTheoryChord('not-a-chord')).toBeNull();
  });
});

describe('chordPlaybackSettings helpers', () => {
  it('computes effective volumes', () => {
    expect(effectiveChordPlaybackVelocity(DEFAULT_CHORD_PLAYBACK_SETTINGS)).toBeCloseTo(0.72);
    expect(
      effectiveDrumPlaybackVolume({ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true }),
    ).toBeCloseTo(0.42);
    expect(
      effectiveDrumPlaybackVolume({ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: false }),
    ).toBe(0);
  });
});

describe('chord playback settings persistence', () => {
  const KEY = 'test-chord-playback-persistence';

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists song-wide drum config in durable storage that survives a new session', () => {
    const chosen = {
      ...DEFAULT_CHORD_PLAYBACK_SETTINGS,
      drumsEnabled: true,
      drumsVolume: 88,
      drumPattern: 'D-K-D-K-D-K-D-K-',
    };
    saveChordPlaybackSettings(KEY, chosen);

    // Must use tab-independent localStorage (survives tab close / new tab), NOT
    // per-tab sessionStorage which is wiped on session end and reset the config.
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();

    // A fresh load (a new session) recovers the drum config, not defaults.
    const reloaded = loadChordPlaybackSettings(KEY);
    expect(reloaded.drumsEnabled).toBe(true);
    expect(reloaded.drumsVolume).toBe(88);
    expect(reloaded.drumPattern).toBe('D-K-D-K-D-K-D-K-');
  });

  it('back-fills missing fields from defaults for forward compatibility', () => {
    localStorage.setItem(KEY, JSON.stringify({ drumsEnabled: true }));
    const reloaded = loadChordPlaybackSettings(KEY);
    expect(reloaded.drumsEnabled).toBe(true);
    expect(reloaded.drumPattern).toBe(DEFAULT_CHORD_PLAYBACK_SETTINGS.drumPattern);
  });
});
