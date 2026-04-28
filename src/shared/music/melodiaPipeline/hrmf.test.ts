import { describe, expect, it } from 'vitest';
import type { PianoScore, ScorePart } from '../scoreTypes';
import { collectPitchSequence, collectRhythmicProfile, pianoScoreToHrmf } from './hrmf';

function oneLineScore(): { score: PianoScore; part: ScorePart } {
  const part: ScorePart = {
    id: 'p',
    name: 'Melody',
    clef: 'treble',
    hand: 'right',
    measures: [
      {
        notes: [
          { id: 'a', pitches: [60], duration: 'quarter' },
          { id: 'b', pitches: [62], duration: 'quarter' },
          { id: 'c', pitches: [64], duration: 'half' },
        ],
      },
    ],
  };
  const score: PianoScore = {
    id: 's',
    title: 'S',
    key: 'C',
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 72,
    parts: [part],
  };
  return { score, part };
}

describe('melodiaPipeline hrmf', () => {
  it('pianoScoreToHrmf encodes measures', () => {
    const { score, part } = oneLineScore();
    expect(pianoScoreToHrmf(score, part)).toBe('4/4|C4(1) D4(1) E4(2)|');
  });

  it('collectPitchSequence', () => {
    const { part } = oneLineScore();
    expect(collectPitchSequence(part)).toEqual([60, 62, 64]);
  });

  it('collectRhythmicProfile', () => {
    const { part } = oneLineScore();
    expect(collectRhythmicProfile(part)).toEqual(['half', 'quarter']);
  });
});
