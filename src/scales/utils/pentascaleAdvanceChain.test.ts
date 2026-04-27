import { describe, it, expect } from 'vitest';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import type { SessionExercise } from '../curriculum/types';
import { advanceFreeTempoCursor } from './freeTempoCursorStep';

function sessionEx(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    exerciseId: 'C-pentascale-major',
    stageId: 'C-pentascale-major-p2',
    key: 'C',
    kind: 'pentascale-major',
    hand: 'left',
    bpm: 0,
    useMetronome: false,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    purpose: undefined,
    ...overrides,
  };
}

describe('pentascale advance chain (pre-start probe sanity)', () => {
  it('LH C pentascale free tempo has many steps before advance completes', () => {
    const score = generateScoreForExercise(sessionEx({ stageId: 'C-pentascale-major-p2', hand: 'left' }));
    expect(score).not.toBeNull();
    let mi = 0;
    let ni = 0;
    let steps = 0;
    while (steps < 50) {
      const next = advanceFreeTempoCursor(score!, mi, ni);
      if (next.kind === 'complete') break;
      mi = next.measureIndex;
      ni = next.noteIndex;
      steps++;
    }
    expect(steps).toBeGreaterThan(3);
  });

  it('BH C pentascale free tempo first slot expects two simultaneous pitches', () => {
    const score = generateScoreForExercise(sessionEx({ stageId: 'C-pentascale-major-p3', hand: 'both' }));
    expect(score).not.toBeNull();
    const parts = score!.parts;
    const at00 = parts.flatMap(p => {
      const n = p.measures[0]?.notes[0];
      return n && !n.rest ? n.pitches : [];
    });
    expect(at00.length).toBe(2);
  });

  it('counts playable LH C pentascale slots (sanity for probe length)', () => {
    const score = generateScoreForExercise(sessionEx({ stageId: 'C-pentascale-major-p2', hand: 'left' }));
    expect(score).not.toBeNull();
    let playable = 0;
    for (let mi = 0; mi < score!.parts[0]!.measures.length; mi++) {
      const len = score!.parts[0]!.measures[mi]!.notes.length;
      for (let ni = 0; ni < len; ni++) {
        const n = score!.parts[0]!.measures[mi]!.notes[ni];
        if (n && !n.rest) playable++;
      }
    }
    expect(playable).toBeGreaterThan(3);
  });
});
