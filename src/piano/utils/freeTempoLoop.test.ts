import { describe, it, expect } from 'vitest';
import { resolveFreeTempoLoopStartPosition } from './freeTempoLoop';
import type { PianoScore } from '../types';

describe('resolveFreeTempoLoopStartPosition', () => {
  it('skips leading rests and picks the first playable note', () => {
    const practicedParts: PianoScore['parts'] = [
      {
        id: 'rh',
        name: 'Right Hand',
        clef: 'treble',
        hand: 'right',
        measures: [
          {
            notes: [
              { id: 'r0', pitches: [], duration: 'quarter', rest: true },
              { id: 'n1', pitches: [64], duration: 'quarter' },
            ],
          },
        ],
      },
    ];

    expect(resolveFreeTempoLoopStartPosition(practicedParts, 0)).toEqual({
      measureIndex: 0,
      noteIndex: 1,
    });
  });

  it('returns start measure with sentinel -1 when no playable notes exist', () => {
    const practicedParts: PianoScore['parts'] = [
      {
        id: 'rh',
        name: 'Right Hand',
        clef: 'treble',
        hand: 'right',
        measures: [{ notes: [{ id: 'r0', pitches: [], duration: 'quarter', rest: true }] }],
      },
    ];
    expect(resolveFreeTempoLoopStartPosition(practicedParts, 2)).toEqual({
      measureIndex: 2,
      noteIndex: -1,
    });
  });
});
