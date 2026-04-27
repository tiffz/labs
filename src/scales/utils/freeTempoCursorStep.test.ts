import { describe, it, expect } from 'vitest';
import type { PianoScore } from '../../shared/music/scoreTypes';
import { advanceFreeTempoCursor } from './freeTempoCursorStep';

function note(pitches: number[], rest = false): import('../../shared/music/scoreTypes').ScoreNote {
  return {
    id: `n-${pitches.join('-')}`,
    pitches,
    duration: 'quarter',
    ...(rest ? { rest: true } : {}),
  };
}

describe('advanceFreeTempoCursor', () => {
  it('advances from first playable to the next', () => {
    const score: PianoScore = {
      id: 't',
      title: 'T',
      key: 'C',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 60,
      parts: [
        {
          id: 'rh',
          name: 'RH',
          clef: 'treble',
          hand: 'right',
          measures: [{ notes: [note([60]), note([62])] }],
        },
      ],
    };
    const first = advanceFreeTempoCursor(score, 0, 0);
    expect(first.kind).toBe('next');
    if (first.kind === 'next') {
      expect(first.measureIndex).toBe(0);
      expect(first.noteIndex).toBe(1);
    }
    const done = advanceFreeTempoCursor(score, 0, 1);
    expect(done.kind).toBe('complete');
  });

  it('skips rests when advancing', () => {
    const score: PianoScore = {
      id: 't',
      title: 'T',
      key: 'C',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 60,
      parts: [
        {
          id: 'rh',
          name: 'RH',
          clef: 'treble',
          hand: 'right',
          measures: [{ notes: [note([60]), note([], true), note([64])] }],
        },
      ],
    };
    const next = advanceFreeTempoCursor(score, 0, 0);
    expect(next.kind).toBe('next');
    if (next.kind === 'next') {
      expect(next.noteIndex).toBe(2);
    }
  });
});
