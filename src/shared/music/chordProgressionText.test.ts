import { describe, expect, it } from 'vitest';
import {
  inferKeyFromChordSymbols,
  parseProgressionText,
} from './chordProgressionText';

describe('chord progression text parsing', () => {
  it('parses roman progression using selected key', () => {
    const parsed = parseProgressionText('I–V–vi–IV', 'D');
    expect(parsed.isValid).toBe(true);
    expect(parsed.format).toBe('roman');
    expect(parsed.chordSymbols).toEqual(['D', 'A', 'Bm', 'G']);
    expect(parsed.inferredKey).toBe('D');
  });

  it('parses chord progression and infers key', () => {
    const parsed = parseProgressionText('C-G-Am-F', 'E');
    expect(parsed.isValid).toBe(true);
    expect(parsed.format).toBe('chord');
    expect(parsed.inferredKey).toBe('C');
    expect(parsed.chordSymbols).toEqual(['C', 'G', 'Am', 'F']);
    expect(parsed.romanNumerals).toEqual(['I', 'V', 'vi', 'IV']);
  });

  it('infers key from diatonic chords', () => {
    expect(inferKeyFromChordSymbols(['Db', 'Ab', 'Bbm', 'Gb'])).toBe('Db');
  });

  it('auto-normalizes chord qualities to nearest diatonic progression when needed', () => {
    const parsed = parseProgressionText('Dm-A-C-F', 'C');
    expect(parsed.isValid).toBe(true);
    expect(parsed.format).toBe('chord');
    expect(parsed.inferredKey).toBe('C');
    expect(parsed.romanNumerals).toEqual(['ii', 'vi', 'I', 'IV']);
    expect(parsed.chordSymbols).toEqual(['Dm', 'Am', 'C', 'F']);
  });

  it('maps Dm-G-C-F into the number system in C', () => {
    const parsed = parseProgressionText('Dm-G-C-F', 'G');
    expect(parsed.isValid).toBe(true);
    expect(parsed.format).toBe('chord');
    expect(parsed.inferredKey).toBe('C');
    expect(parsed.romanNumerals).toEqual(['ii', 'V', 'I', 'IV']);
    expect(parsed.chordSymbols).toEqual(['Dm', 'G', 'C', 'F']);
  });

  it('supports key-aware toggle for chord parsing', () => {
    const parsed = parseProgressionText('C-G-Am-F', 'E', { keyAware: false, inferKey: false });
    expect(parsed.isValid).toBe(true);
    expect(parsed.inferredKey).toBe('E');
    expect(parsed.romanNumerals).toEqual([]);
  });

  it('returns resolved display metadata', () => {
    const parsed = parseProgressionText('I-V-vi-IV', 'C');
    expect(parsed.resolvedKey).toBe('C');
    expect(parsed.resolvedDisplay).toBe('C–G–Am–F');
  });
});
