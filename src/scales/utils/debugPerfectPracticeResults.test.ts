import { describe, expect, it } from 'vitest';
import type { PianoScore } from '../../shared/music/scoreTypes';
import { collectGradedScoreNotes, perfectPracticeResultForNote } from './debugPerfectPracticeResults';

const tinyScore: PianoScore = {
  id: 't',
  title: 't',
  key: 'C',
  timeSignature: { numerator: 4, denominator: 4 },
  tempo: 60,
  parts: [
    {
      id: 'p1',
      name: 'RH',
      clef: 'treble',
      hand: 'right',
      measures: [
        {
          notes: [
            { id: 'n1', pitches: [60], duration: 'quarter' },
            { id: 'n2', pitches: [], duration: 'quarter', rest: true },
            { id: 'n3', pitches: [64, 67], duration: 'quarter' },
          ],
        },
      ],
    },
  ],
};

describe('debugPerfectPracticeResults', () => {
  it('collects non-rest notes with pitches', () => {
    const notes = collectGradedScoreNotes(tinyScore);
    expect(notes.map(n => n.id)).toEqual(['n1', 'n3']);
  });

  it('builds a perfect practice row for a chord note', () => {
    const chord = tinyScore.parts[0].measures[0].notes[2];
    const r = perfectPracticeResultForNote(chord);
    expect(r.noteId).toBe('n3');
    expect(r.timing).toBe('perfect');
    expect(r.expectedPitches).toEqual([64, 67]);
    expect(r.playedPitches).toEqual([64, 67]);
  });
});
