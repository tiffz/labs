import { describe, expect, it } from 'vitest';
import {
  joinProgressionTokens,
  normalizeProgressionSeparators,
  splitProgressionInput,
} from './chordProgressionSeparators';

describe('chordProgressionSeparators', () => {
  it('splits arrow and dash separators without breaking slash bass', () => {
    expect(splitProgressionInput('Dm → Bbmaj7/D → Gm/D → Asus4')).toEqual([
      'Dm',
      'Bbmaj7/D',
      'Gm/D',
      'Asus4',
    ]);
  });

  it('splits common ASCII separators', () => {
    expect(splitProgressionInput('C-G-Am-F')).toEqual(['C', 'G', 'Am', 'F']);
    expect(splitProgressionInput('C, G, Am, F')).toEqual(['C', 'G', 'Am', 'F']);
    expect(splitProgressionInput('C | G | Am | F')).toEqual(['C', 'G', 'Am', 'F']);
    expect(splitProgressionInput('Dm->Bbmaj7/D=>Gm/D')).toEqual(['Dm', 'Bbmaj7/D', 'Gm/D']);
  });

  it('splits spaced slash between chords only', () => {
    expect(splitProgressionInput('C / G / Am')).toEqual(['C', 'G', 'Am']);
    expect(splitProgressionInput('Gm/D')).toEqual(['Gm/D']);
  });

  it('normalizes to en-dash joined tokens', () => {
    expect(normalizeProgressionSeparators('Dm → Bbmaj7/D → Gm/D')).toBe(
      'Dm–Bbmaj7/D–Gm/D',
    );
    expect(joinProgressionTokens(['C', 'G', 'Am'])).toBe('C–G–Am');
  });
});
