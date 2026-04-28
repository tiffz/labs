import { describe, expect, it } from 'vitest';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import type { SessionExercise } from '../curriculum/types';
import { collectFingerCrossingRegions } from './fingerCrossingHighlights';

function sessionExercise(partial: Partial<SessionExercise>): SessionExercise {
  return {
    exerciseId: 'test-ex',
    stageId: 'test-stage',
    key: 'C',
    kind: 'major-scale',
    hand: 'right',
    bpm: 0,
    useMetronome: false,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    purpose: 'new',
    ...partial,
  };
}

describe('collectFingerCrossingRegions', () => {
  it('marks thumb-crossing pairs on C major RH one octave', () => {
    const score = generateScoreForExercise(sessionExercise({ hand: 'right', octaves: 1 }));
    expect(score).not.toBeNull();
    const regions = collectFingerCrossingRegions(score!);
    expect(regions.length).toBeGreaterThan(0);
  });

  it('pairs always move in the expected pitch direction (tuck up, cross-over down)', () => {
    const score = generateScoreForExercise(sessionExercise({ hand: 'right', octaves: 1 }));
    expect(score).not.toBeNull();
    const regions = collectFingerCrossingRegions(score!);
    const rh = score!.parts.find(p => p.hand === 'right');
    expect(rh).toBeTruthy();
    const idToMidi = new Map<string, number>();
    const idToFinger = new Map<string, number>();
    for (const measure of rh!.measures) {
      for (const n of measure.notes) {
        if (n.rest || n.grace || n.finger == null || n.pitches.length === 0) continue;
        idToMidi.set(n.id, Math.min(...n.pitches));
        idToFinger.set(n.id, n.finger!);
      }
    }
    for (const r of regions) {
      const m0 = idToMidi.get(r.noteIds[0]);
      const m1 = idToMidi.get(r.noteIds[1]);
      const f0 = idToFinger.get(r.noteIds[0]);
      const f1 = idToFinger.get(r.noteIds[1]);
      expect(m0).toBeDefined();
      expect(m1).toBeDefined();
      expect(f0).toBeDefined();
      expect(f1).toBeDefined();
      if (f1 === 1 && f0! >= 2 && f0! <= 4) expect(m1!).toBeGreaterThan(m0!);
      if (f0 === 1 && f1! >= 3 && f1! <= 4) expect(m1!).toBeLessThan(m0!);
      if (f0 === 1 && f1 === 2) expect(m1!).toBeLessThan(m0!);
    }
  });

  it('finds at least as many crossings on two octaves as one (extra thumb pass)', () => {
    const oneOct = generateScoreForExercise(sessionExercise({ hand: 'right', octaves: 1 }));
    const twoOct = generateScoreForExercise(sessionExercise({ hand: 'right', octaves: 2 }));
    expect(oneOct && twoOct).toBeTruthy();
    const a = collectFingerCrossingRegions(oneOct!);
    const b = collectFingerCrossingRegions(twoOct!);
    expect(b.length).toBeGreaterThanOrEqual(a.length);
  });

  it('finds ascending and descending LH thumb work on C major one octave', () => {
    const score = generateScoreForExercise(
      sessionExercise({ hand: 'left', octaves: 1, kind: 'major-scale' }),
    );
    expect(score).not.toBeNull();
    const regions = collectFingerCrossingRegions(score!);
    expect(regions).toHaveLength(2);
    const lh = score!.parts.find((p) => p.hand === 'left');
    expect(lh).toBeTruthy();
    const idToMidi = new Map<string, number>();
    const idToFinger = new Map<string, number>();
    for (const measure of lh!.measures) {
      for (const n of measure.notes) {
        if (n.rest || n.grace || n.finger == null || n.pitches.length === 0) continue;
        idToMidi.set(n.id, Math.min(...n.pitches));
        idToFinger.set(n.id, n.finger!);
      }
    }
    const rises = regions.filter((r) => {
      const a = idToMidi.get(r.noteIds[0])!;
      const b = idToMidi.get(r.noteIds[1])!;
      return b > a;
    });
    const falls = regions.filter((r) => {
      const a = idToMidi.get(r.noteIds[0])!;
      const b = idToMidi.get(r.noteIds[1])!;
      return b < a;
    });
    expect(rises.length).toBe(1);
    expect(falls.length).toBe(1);
    const asc = rises[0]!;
    expect(idToFinger.get(asc.noteIds[0])).toBe(2);
    expect(idToFinger.get(asc.noteIds[1])).toBe(1);
    const desc = falls[0]!;
    expect(idToFinger.get(desc.noteIds[0])).toBe(1);
    expect(idToFinger.get(desc.noteIds[1])).toBe(2);
  });

  it('Tier-1 major scales: two callouts per hand (Bb RH skips opening 2→1 tuck only)', () => {
    const tier1: SessionExercise['key'][] = ['C', 'G', 'F', 'D', 'Bb'];
    for (const key of tier1) {
      for (const hand of ['right', 'left'] as const) {
        const score = generateScoreForExercise(
          sessionExercise({ key, hand, octaves: 1, kind: 'major-scale' }),
        );
        expect(score).toBeTruthy();
        const n = collectFingerCrossingRegions(score!).length;
        expect(n, `${key} ${hand}`).toBe(2);
      }
    }
  });

  it('does not box the scale turnaround at the LH pitch peak (thumb-under landing)', () => {
    const score = generateScoreForExercise(
      sessionExercise({ hand: 'left', octaves: 1, kind: 'major-scale' }),
    );
    expect(score).not.toBeNull();
    const lh = score!.parts.find((p) => p.hand === 'left');
    expect(lh).toBeTruthy();

    type Entry = { id: string; midi: number; finger: number };
    const seq: Entry[] = [];
    for (const measure of lh!.measures) {
      for (const n of measure.notes) {
        if (n.rest || n.grace || n.finger == null || n.pitches.length === 0) continue;
        seq.push({ id: n.id, midi: Math.min(...n.pitches), finger: n.finger });
      }
    }

    let peakIdx = 0;
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].midi > seq[peakIdx].midi) peakIdx = i;
    }
    const peak = seq[peakIdx];
    const prev = peakIdx > 0 ? seq[peakIdx - 1] : null;
    const wouldBeThumbUnderToPeak = prev
      && peak.finger === 1
      && prev.finger >= 2
      && prev.finger <= 4
      && prev.midi !== peak.midi;

    expect(wouldBeThumbUnderToPeak).toBe(true);

    const regions = collectFingerCrossingRegions(score!);
    const boxedTurnaround = regions.some(
      (r) => r.noteIds[0] === prev!.id && r.noteIds[1] === peak.id,
    );
    expect(boxedTurnaround).toBe(false);
  });
});
