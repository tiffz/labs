import { describe, it, expect } from 'vitest';
import type { Key, PianoScore } from '../types';
import { durationToBeats } from '../types';
import {
  DEFAULT_SCORE,
  generateExerciseScore,
  generateChromaticScore,
} from './scales';

function beatsPerMeasure(score: PianoScore): number {
  const { numerator, denominator } = score.timeSignature;
  return (numerator / denominator) * 4;
}

function assertMeasuresFitTimeSignature(score: PianoScore): void {
  const target = beatsPerMeasure(score);
  for (const part of score.parts) {
    for (const measure of part.measures) {
      let sum = 0;
      for (const note of measure.notes) {
        sum += durationToBeats(note.duration, note.dotted);
      }
      expect(sum).toBeCloseTo(target, 5);
    }
  }
}

function assertEveryPlayedNoteHasFinger(score: PianoScore): void {
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const note of measure.notes) {
        if (!note.rest) {
          expect(note.finger, `missing finger on note ${note.id}`).toBeDefined();
        }
      }
    }
  }
}

function countNonRestNotes(score: PianoScore): number {
  let n = 0;
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const note of measure.notes) {
        if (!note.rest) n += 1;
      }
    }
  }
  return n;
}

describe('scales', () => {
  describe('DEFAULT_SCORE', () => {
    it('is defined with right and left hand parts', () => {
      expect(DEFAULT_SCORE).not.toBeNull();
      expect(DEFAULT_SCORE.parts).toHaveLength(2);
      const ids = DEFAULT_SCORE.parts.map(p => p.id);
      expect(ids).toContain('rh');
      expect(ids).toContain('lh');
    });
  });

  describe('generateExerciseScore', () => {
    it('builds a C major ascending scale with both hands', () => {
      const score = generateExerciseScore('major', 'scale', 'C', 'ascending');
      expect(score).not.toBeNull();
      expect(score!.key).toBe('C');
      expect(score!.parts).toHaveLength(2);
      expect(score!.parts.map(p => p.id).sort()).toEqual(['lh', 'rh']);
    });

    it('builds A minor descending arpeggio', () => {
      const score = generateExerciseScore('minor', 'arpeggio', 'A', 'descending');
      expect(score).not.toBeNull();
      expect(score!.key).toBe('A');
      expect(score!.parts).toHaveLength(2);
    });

    it('includes more notes for both directions than ascending alone', () => {
      const asc = generateExerciseScore('major', 'scale', 'C', 'ascending')!;
      const both = generateExerciseScore('major', 'scale', 'C', 'both')!;
      expect(countNonRestNotes(both)).toBeGreaterThan(countNonRestNotes(asc));
    });

    it('extends range with more octaves', () => {
      const one = generateExerciseScore('major', 'scale', 'C', 'ascending', 1)!;
      const two = generateExerciseScore('major', 'scale', 'C', 'ascending', 2)!;
      expect(countNonRestNotes(two)).toBeGreaterThan(countNonRestNotes(one));
    });

    it('uses eighth notes when subdivision is 2', () => {
      const score = generateExerciseScore('major', 'scale', 'C', 'ascending', 1, 2)!;
      for (const part of score.parts) {
        for (const measure of part.measures) {
          for (const note of measure.notes) {
            if (!note.rest) {
              expect(note.duration).toBe('eighth');
            }
          }
        }
      }
    });

    it('returns null for an unknown key', () => {
      expect(generateExerciseScore('major', 'scale', 'Z' as Key, 'ascending')).toBeNull();
    });
  });

  describe('generateChromaticScore', () => {
    it('produces 13 chromatic steps per octave ascending from C', () => {
      const score = generateChromaticScore('C', 'ascending')!;
      const rh = score.parts.find(p => p.id === 'rh')!;
      const played = rh.measures.flatMap(m => m.notes).filter(n => !n.rest);
      expect(played).toHaveLength(13);
    });

    it('has more notes when direction is both', () => {
      const asc = generateChromaticScore('C', 'ascending')!;
      const both = generateChromaticScore('C', 'both')!;
      expect(countNonRestNotes(both)).toBeGreaterThan(countNonRestNotes(asc));
    });
  });

  describe('score invariants', () => {
    const scores: PianoScore[] = [
      DEFAULT_SCORE,
      generateExerciseScore('major', 'scale', 'C', 'ascending')!,
      generateExerciseScore('minor', 'arpeggio', 'A', 'descending')!,
      generateExerciseScore('major', 'scale', 'C', 'both', 2, 2)!,
      generateChromaticScore('C', 'ascending')!,
      generateChromaticScore('C', 'both', 1, 2)!,
    ];

    it.each(scores.map((s, i) => [i, s] as const))(
      'score %# fills measures to the time signature and fingers every played note',
      (_, score) => {
        assertMeasuresFitTimeSignature(score);
        assertEveryPlayedNoteHasFinger(score);
      },
    );
  });
});
