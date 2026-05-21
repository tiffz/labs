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
    expect(matchFocusAxes({ hue: true, chroma: true })).toEqual(['l']);
    expect(matchFocusAxes({ hue: true, chroma: false })).toEqual(['l', 'c']);
    expect(matchFocusAxes({ hue: false, chroma: false })).toEqual(['l', 'c', 'h']);
  });
});
