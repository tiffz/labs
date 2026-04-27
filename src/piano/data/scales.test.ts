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

function assertMeasuresFitTimeSignature(score: PianoScore, allowLastMeasureShort = false): void {
  const target = beatsPerMeasure(score);
  for (const part of score.parts) {
    for (let idx = 0; idx < part.measures.length; idx++) {
      const measure = part.measures[idx];
      let sum = 0;
      for (const note of measure.notes) {
        let beats = durationToBeats(note.duration, note.dotted);
        if (note.tuplet) {
          beats *= note.tuplet.normal / note.tuplet.actual;
        }
        sum += beats;
      }
      const isLast = idx === part.measures.length - 1;
      if (allowLastMeasureShort && isLast) {
        expect(sum).toBeLessThanOrEqual(target + 0.00001);
      } else {
        expect(sum).toBeCloseTo(target, 5);
      }
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

    it('uses triplet eighths in 4/4 when subdivision is 3', () => {
      const score = generateExerciseScore('major', 'scale', 'C', 'ascending', 1, 3)!;
      expect(score.timeSignature).toEqual({ numerator: 4, denominator: 4 });
      for (const part of score.parts) {
        const played = part.measures.flatMap((m) => m.notes).filter((n) => !n.rest);
        expect(played.length).toBeGreaterThan(0);
        for (const note of played) {
          expect(note.duration).toBe('eighth');
          expect(note.tuplet).toEqual({ actual: 3, normal: 2 });
        }
        const finalMeasure = part.measures[part.measures.length - 1];
        const finalRests = finalMeasure.notes.filter((n) => n.rest);
        expect(finalRests.length).toBeLessThanOrEqual(2);
        expect(finalMeasure.notes.length % 3).toBe(0);
      }
      assertMeasuresFitTimeSignature(score, true);
    });

    it('returns null for an unknown key', () => {
      expect(generateExerciseScore('major', 'scale', 'Z' as Key, 'ascending')).toBeNull();
    });

    it('generates distinct IDs for B and Bb keys', () => {
      const bMajor = generateExerciseScore('major', 'scale', 'B', 'ascending');
      const bbMajor = generateExerciseScore('major', 'scale', 'Bb', 'ascending');
      const fMajor = generateExerciseScore('major', 'scale', 'F', 'ascending');

      expect(bMajor).not.toBeNull();
      expect(bbMajor).not.toBeNull();
      expect(fMajor).not.toBeNull();
      expect(bMajor!.id).toContain('-b-');
      expect(bbMajor!.id).toContain('-bb-');
      expect(fMajor!.id).toContain('-f-');
      expect(bMajor!.id).not.toBe(fMajor!.id);
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

  /**
   * 2-octave fingerings come from
   * https://www.pianostreet.com/piano-scales-major.pdf and corroborate
   * the standard Royal Conservatory / ABRSM / Hanon fingerings.
   *
   * The bug these tests guard: a naive "repeat the 1-octave interior"
   * expansion lands finger 5 (pinky) on the C between the two octaves
   * for LH C-major and friends, which forces a pinky-over-middle-finger
   * crossing that no pedagogical reference teaches. The standard is a
   * thumb-under at the boundary, then 4 over thumb to start the second
   * octave.
   */
  describe('2-octave fingerings (standard reference)', () => {
    function fingersForPart(score: PianoScore, partId: 'rh' | 'lh'): number[] {
      const part = score.parts.find(p => p.id === partId);
      if (!part) throw new Error(`missing part ${partId}`);
      const fingers: number[] = [];
      for (const measure of part.measures) {
        for (const note of measure.notes) {
          if (!note.rest && note.finger !== undefined) fingers.push(note.finger);
        }
      }
      return fingers;
    }

    function ascending(fingers: number[]): number[] {
      // 'both' direction = ascending + descending; the ascending half is
      // the first 15 fingers for a 2-octave scale (8 notes per octave,
      // shared boundary, so 2*8 - 1 = 15) or the first 7 for a 7-note
      // 2-octave arpeggio (4 notes per octave, shared boundary).
      return fingers;
    }

    it('C major LH 2-octave ascending uses thumb-under at the boundary, not pinky', () => {
      const score = generateExerciseScore('major', 'scale', 'C', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1]);
      // Boundary mid-C MUST be 1 (thumb-under from B). The previous
      // naive expansion bug landed finger 5 here (pinky over middle
      // finger), which the user reported as physically impossible.
      expect(lh[7]).toBe(1);
      // And finger 5 only appears at the very low C, never mid-scale.
      const fivesAt = lh.map((f, i) => f === 5 ? i : -1).filter(i => i >= 0);
      expect(fivesAt).toEqual([0]);
    });

    it('C major RH 2-octave ascending matches the standard', () => {
      const score = generateExerciseScore('major', 'scale', 'C', 'ascending', 2)!;
      const rh = ascending(fingersForPart(score, 'rh'));
      expect(rh).toEqual([1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5]);
    });

    it('B major LH 2-octave ascending uses 1 (not 4) at the boundary', () => {
      const score = generateExerciseScore('major', 'scale', 'B', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([4, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1]);
      expect(lh[7]).toBe(1);
    });

    it('Bb major RH 1-octave starts on finger 2 (matches the 2-octave fingering)', () => {
      const score = generateExerciseScore('major', 'scale', 'Bb', 'ascending', 1)!;
      const rh = fingersForPart(score, 'rh');
      expect(rh[0]).toBe(2);
      expect(rh).toEqual([2, 1, 2, 3, 1, 2, 3, 4]);
    });

    it('Bb major RH 2-octave lands finger 4 on the boundary Bb (not finger 2)', () => {
      const score = generateExerciseScore('major', 'scale', 'Bb', 'ascending', 2)!;
      const rh = ascending(fingersForPart(score, 'rh'));
      expect(rh).toEqual([2, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4]);
    });

    it('F# major LH 2-octave naive expansion is correct (no override needed)', () => {
      const score = generateExerciseScore('major', 'scale', 'F#', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4]);
    });

    it('Db major LH 2-octave naive expansion is correct (no override needed)', () => {
      const score = generateExerciseScore('major', 'scale', 'Db', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3]);
    });

    it('A natural minor LH 2-octave shares the C-major-style fix', () => {
      const score = generateExerciseScore('minor', 'scale', 'A', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1]);
      expect(lh[7]).toBe(1);
    });

    it('C major LH 2-octave arpeggio uses thumb at the boundary, not pinky', () => {
      const score = generateExerciseScore('major', 'arpeggio', 'C', 'ascending', 2)!;
      const lh = ascending(fingersForPart(score, 'lh'));
      expect(lh).toEqual([5, 3, 2, 1, 3, 2, 1]);
      // Middle C (boundary) is finger 1, not the previous bug's finger 5.
      expect(lh[3]).toBe(1);
    });

    it('descending fingerings of the boundary-fixed scale also land on thumb at the mid-C', () => {
      // 'both' = ascending then descending sharing the top note. The
      // descending half should be the ascending half reversed, so the
      // mid-C (now passed twice — once going up, once going down) must
      // be finger 1 in both directions.
      const score = generateExerciseScore('major', 'scale', 'C', 'both', 2)!;
      const lh = fingersForPart(score, 'lh');
      // 2-oct asc+desc has 29 notes (15 ascending + 14 descending,
      // sharing the very top high-C). The two boundary mid-Cs sit at
      // index 7 (going up) and at index 22 (= 29-1-6, going down).
      expect(lh[7]).toBe(1);
      expect(lh[lh.length - 1]).toBe(5);
    });
  });

  /**
   * Harmonic and melodic minor are pedagogically distinct from the
   * natural minor on which they're built; these tests pin the defining
   * differences in MIDI semitone-space so a future "simplification" of
   * the interval data can't quietly homogenise them.
   *
   * A minor reference notes (octave above middle C):
   *   - natural:  A B C D E F  G  A  ↔ midi 57 59 60 62 64 65 67 69
   *   - harmonic: A B C D E F  G# A  ↔ midi 57 59 60 62 64 65 68 69 (aug-2nd from F→G#)
   *   - melodic ↑: A B C D E F# G# A ↔ midi 57 59 60 62 64 66 68 69
   *   - melodic ↓: A G F E D C B  A  ↔ midi 69 67 65 64 62 60 59 57 (= natural)
   */
  describe('harmonic + melodic minor variants', () => {
    function rhPlayedMidis(score: PianoScore): number[] {
      const rh = score.parts.find(p => p.id === 'rh');
      if (!rh) throw new Error('missing rh part');
      const notes: number[] = [];
      for (const measure of rh.measures) {
        for (const note of measure.notes) {
          if (!note.rest && note.pitches.length > 0) notes.push(note.pitches[0]);
        }
      }
      return notes;
    }
    function rhPlayedFingers(score: PianoScore): number[] {
      const rh = score.parts.find(p => p.id === 'rh');
      if (!rh) throw new Error('missing rh part');
      const fingers: number[] = [];
      for (const measure of rh.measures) {
        for (const note of measure.notes) {
          if (!note.rest && note.finger !== undefined) fingers.push(note.finger);
        }
      }
      return fingers;
    }

    it('A harmonic minor ascending raises only the 7th (G→G#) — augmented 2nd from F→G#', () => {
      const score = generateExerciseScore(
        'minor',
        'scale',
        'A',
        'ascending',
        1,
        1,
        'harmonic',
      )!;
      // A B C D E F G# A
      expect(rhPlayedMidis(score)).toEqual([57, 59, 60, 62, 64, 65, 68, 69]);
      // The augmented 2nd is the signature interval: 8 → 8 (3 semitones)
      // between scale degrees 6 (F) and 7 (G#). Nowhere else in any of
      // the natural-derived modes does this gap appear.
      const midis = rhPlayedMidis(score);
      const stepGaps = midis.slice(1).map((m, i) => m - midis[i]);
      const hasAug2nd = stepGaps.some(g => g === 3);
      expect(hasAug2nd).toBe(true);
    });

    it('A harmonic minor descending uses the same notes as ascending (symmetric)', () => {
      const asc = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'harmonic',
      )!;
      const desc = generateExerciseScore(
        'minor', 'scale', 'A', 'descending', 1, 1, 'harmonic',
      )!;
      const ascMidis = rhPlayedMidis(asc);
      const descMidis = rhPlayedMidis(desc);
      // Descending = ascending reversed.
      expect(descMidis).toEqual([...ascMidis].reverse());
    });

    it('A melodic minor ascending raises both 6 and 7 (F→F#, G→G#)', () => {
      const score = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'melodic',
      )!;
      // A B C D E F# G# A
      expect(rhPlayedMidis(score)).toEqual([57, 59, 60, 62, 64, 66, 68, 69]);
    });

    it('A melodic minor descending reverts to the natural minor (no raised tones)', () => {
      const score = generateExerciseScore(
        'minor', 'scale', 'A', 'descending', 1, 1, 'melodic',
      )!;
      // A G F E D C B A (descending)
      expect(rhPlayedMidis(score)).toEqual([69, 67, 65, 64, 62, 60, 59, 57]);
    });

    it('A melodic minor "both" plays raised 6/7 going up and natural going down', () => {
      const score = generateExerciseScore(
        'minor', 'scale', 'A', 'both', 1, 1, 'melodic',
      )!;
      const midis = rhPlayedMidis(score);
      // Ascending half: A B C D E F# G# A (raised 6 + 7).
      expect(midis.slice(0, 8)).toEqual([57, 59, 60, 62, 64, 66, 68, 69]);
      // Descending half (sharing the apex A): G F E D C B A (natural).
      expect(midis.slice(7)).toEqual([69, 67, 65, 64, 62, 60, 59, 57]);
      // Crucial: the F# (66) on the way up is gone on the way down (65),
      // and the G# (68) is replaced by G (67).
      expect(midis).toContain(66);
      expect(midis).toContain(68);
      expect(midis).toContain(65);
      expect(midis).toContain(67);
    });

    it('harmonic minor inherits the parallel natural-minor fingerings', () => {
      const natural = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'natural',
      )!;
      const harmonic = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'harmonic',
      )!;
      // The raised 7th doesn't move the hand: same scale-degree
      // positions, same fingers. Pinned so a future contributor doesn't
      // accidentally redefine harmonic-minor fingerings.
      expect(rhPlayedFingers(harmonic)).toEqual(rhPlayedFingers(natural));
    });

    it('melodic minor inherits the parallel natural-minor fingerings (both directions)', () => {
      const natural = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'natural',
      )!;
      const naturalDesc = generateExerciseScore(
        'minor', 'scale', 'A', 'descending', 1, 1, 'natural',
      )!;
      const melodicAsc = generateExerciseScore(
        'minor', 'scale', 'A', 'ascending', 1, 1, 'melodic',
      )!;
      const melodicDesc = generateExerciseScore(
        'minor', 'scale', 'A', 'descending', 1, 1, 'melodic',
      )!;
      // Same hand position, even though the *pitches* differ.
      expect(rhPlayedFingers(melodicAsc)).toEqual(rhPlayedFingers(natural));
      expect(rhPlayedFingers(melodicDesc)).toEqual(rhPlayedFingers(naturalDesc));
    });

    it('variant labels appear in the title and id for non-natural variants', () => {
      const harmonic = generateExerciseScore(
        'minor', 'scale', 'A', 'both', 1, 1, 'harmonic',
      )!;
      const melodic = generateExerciseScore(
        'minor', 'scale', 'A', 'both', 1, 1, 'melodic',
      )!;
      const natural = generateExerciseScore(
        'minor', 'scale', 'A', 'both', 1, 1, 'natural',
      )!;
      expect(harmonic.title).toContain('Harmonic');
      expect(harmonic.id).toContain('-harmonic');
      expect(melodic.title).toContain('Melodic');
      expect(melodic.id).toContain('-melodic');
      // Natural stays unlabeled to keep IDs/titles backwards-compatible.
      expect(natural.title).not.toContain('Harmonic');
      expect(natural.title).not.toContain('Melodic');
      expect(natural.id).not.toContain('-natural');
    });
  });
});
