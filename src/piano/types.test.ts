import { describe, it, expect } from 'vitest';
import {
  durationToBeats,
  midiToNoteName,
  midiToFrequency,
  midiToPitchString,
  midiToPitchStringForKey,
  generateNoteId,
} from './types';
import type { NoteDuration } from './types';

describe('types', () => {
  describe('durationToBeats', () => {
    it('maps all five base durations to quarter-note beats', () => {
      const cases: [NoteDuration, number][] = [
        ['whole', 4],
        ['half', 2],
        ['quarter', 1],
        ['eighth', 0.5],
        ['sixteenth', 0.25],
      ];
      for (const [dur, beats] of cases) {
        expect(durationToBeats(dur)).toBe(beats);
      }
    });

    it('applies dotted lengthening', () => {
      expect(durationToBeats('quarter', true)).toBe(1.5);
      expect(durationToBeats('half', true)).toBe(3);
    });
  });

  describe('midiToNoteName', () => {
    it('maps MIDI numbers to scientific pitch names', () => {
      expect(midiToNoteName(60)).toBe('C4');
      expect(midiToNoteName(69)).toBe('A4');
      expect(midiToNoteName(54)).toBe('F#3');
    });
  });

  describe('midiToFrequency', () => {
    it('maps A4 and octave relations', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 5);
      expect(midiToFrequency(57)).toBeCloseTo(220, 5);
    });
  });

  describe('midiToPitchString', () => {
    it('uses slash before octave', () => {
      expect(midiToPitchString(60)).toBe('C/4');
      expect(midiToPitchString(69)).toBe('A/4');
    });
  });

  describe('midiToPitchStringForKey', () => {
    it('uses flats for flat keys and sharps otherwise', () => {
      expect(midiToPitchStringForKey(61, 'F')).toBe('Db/4');
      expect(midiToPitchStringForKey(61, 'C')).toBe('C#/4');
    });
  });

  describe('generateNoteId', () => {
    it('returns unique strings in n-timestamp-counter form', () => {
      const a = generateNoteId();
      const b = generateNoteId();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^n-\d+-\d+$/);
      expect(b).toMatch(/^n-\d+-\d+$/);
    });
  });
});
