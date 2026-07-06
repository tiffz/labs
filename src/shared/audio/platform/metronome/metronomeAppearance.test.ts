import { describe, expect, it } from 'vitest';
import {
  metronomeSettingsPanelClass,
  metronomeSettingsPopoverClass,
  metronomeSplitControlClass,
  resolveMetronomeAppearance,
} from './metronomeAppearance';

describe('metronomeAppearance', () => {
  it('resolves known appearances', () => {
    expect(resolveMetronomeAppearance('drums')).toBe('drums');
    expect(resolveMetronomeAppearance('words')).toBe('words');
    expect(resolveMetronomeAppearance('piano')).toBe('piano');
    expect(resolveMetronomeAppearance('chords')).toBe('chords');
    expect(resolveMetronomeAppearance('stanza')).toBe('stanza');
    expect(resolveMetronomeAppearance('midi')).toBe('midi');
  });

  it('falls back to default for unknown values', () => {
    expect(resolveMetronomeAppearance('encore')).toBe('default');
    expect(resolveMetronomeAppearance(undefined)).toBe('default');
  });

  it('builds stable class hooks', () => {
    expect(metronomeSplitControlClass('words')).toBe(
      'labs-metronome-split-control labs-metronome-split-control--words',
    );
    expect(metronomeSettingsPopoverClass('drums', 'extra')).toBe(
      'labs-metronome-settings-popover labs-metronome-settings-popover--drums drums-floating-menu extra',
    );
    expect(metronomeSettingsPanelClass('piano')).toBe(
      'labs-metronome-settings-panel labs-metronome-settings-panel--piano',
    );
  });
});
