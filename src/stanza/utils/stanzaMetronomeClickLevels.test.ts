import { describe, expect, it } from 'vitest';
import { stanzaMetronomeClickLevels } from './stanzaMetronomeClickLevels';

describe('stanzaMetronomeClickLevels', () => {
  it('keeps off-beats close to downbeat volume', () => {
    const down = stanzaMetronomeClickLevels(true, 1);
    const off = stanzaMetronomeClickLevels(false, 1);
    expect(off.volume / down.volume).toBeGreaterThan(0.75);
    expect(off.playbackRate).toBe(1);
  });

  it('uses only a slight pitch lift on the downbeat', () => {
    const down = stanzaMetronomeClickLevels(true, 1);
    expect(down.playbackRate).toBeLessThanOrEqual(1.1);
  });
});
