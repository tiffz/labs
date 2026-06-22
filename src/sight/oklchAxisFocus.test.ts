import { describe, expect, it } from 'vitest';
import {
  compareFocusAxis,
  focusAxisName,
  formatFocusAxisValue,
  matchFocusAxes,
} from './oklchAxisFocus';

describe('oklchAxisFocus', () => {
  it('uses lightness for lighter and darker questions', () => {
    expect(compareFocusAxis('lighter')).toBe('l');
    expect(compareFocusAxis('darker')).toBe('l');
    expect(focusAxisName('l')).toBe('Lightness');
  });

  it('uses chroma for saturation questions', () => {
    expect(compareFocusAxis('moreSaturated')).toBe('c');
    expect(formatFocusAxisValue({ l: 0.5, c: 0.12, h: 200 }, 'c')).toBe('0.120');
  });

  it('matchFocusAxes follows slider locks', () => {
    expect(matchFocusAxes({ lightness: false, chroma: true, hue: true })).toEqual(['l']);
    expect(matchFocusAxes({ lightness: true, chroma: false, hue: true })).toEqual(['c']);
    expect(matchFocusAxes({ lightness: false, chroma: false, hue: true })).toEqual(['l', 'c']);
    expect(matchFocusAxes({ lightness: true, chroma: true, hue: false })).toEqual(['h']);
    expect(matchFocusAxes({ lightness: false, chroma: false, hue: false })).toEqual(['l', 'c', 'h']);
  });
});
