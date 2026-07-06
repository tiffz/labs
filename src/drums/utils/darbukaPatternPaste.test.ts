import { describe, expect, it } from 'vitest';
import { isPasteableDarbukaPattern, normalizePastedDarbukaPattern } from './darbukaPatternPaste';

describe('darbukaPatternPaste', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizePastedDarbukaPattern(' d--- \n t--- ')).toBe('D---T---');
  });

  it('accepts valid darbuka patterns', () => {
    expect(isPasteableDarbukaPattern('D---T---', { numerator: 4, denominator: 4 })).toBe(true);
    expect(isPasteableDarbukaPattern('D---------------', { numerator: 4, denominator: 4 })).toBe(true);
  });

  it('rejects invalid clipboard text', () => {
    expect(isPasteableDarbukaPattern('hello world', { numerator: 4, denominator: 4 })).toBe(false);
    expect(isPasteableDarbukaPattern('', { numerator: 4, denominator: 4 })).toBe(false);
  });
});
