import { describe, expect, it } from 'vitest';
import { resolvePlaybackFieldSelectAppearance } from './playbackFieldSelect';

describe('resolvePlaybackFieldSelectAppearance', () => {
  it('maps app skins to shared playback field select appearances', () => {
    expect(resolvePlaybackFieldSelectAppearance('words')).toBe('words');
    expect(resolvePlaybackFieldSelectAppearance('encore')).toBe('encore');
    expect(resolvePlaybackFieldSelectAppearance('chords')).toBe('chords');
    expect(resolvePlaybackFieldSelectAppearance('piano')).toBe('piano');
    expect(resolvePlaybackFieldSelectAppearance('unknown')).toBe('default');
  });
});
