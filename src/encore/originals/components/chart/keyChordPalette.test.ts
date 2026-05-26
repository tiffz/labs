import { describe, expect, it } from 'vitest';
import { keyChordPaletteLayout, keyChordPaletteMaj7s, keyChordPaletteSus } from './keyChordPalette';

describe('keyChordPalette', () => {
  it('includes maj7 and sus segments for a major key', () => {
    const layout = keyChordPaletteLayout('F');
    expect(layout.triads.length).toBeGreaterThan(0);
    expect(layout.sevenths.length).toBe(layout.triads.length);
    expect(layout.maj7s).toEqual(keyChordPaletteMaj7s('F'));
    expect(layout.maj7s.every((c) => c.endsWith('maj7'))).toBe(true);
    expect(layout.sus).toEqual(keyChordPaletteSus('F'));
    expect(layout.sus.some((c) => c.includes('sus4'))).toBe(true);
  });
});
