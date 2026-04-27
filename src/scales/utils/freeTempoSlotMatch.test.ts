import { describe, it, expect } from 'vitest';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import type { SessionExercise } from '../curriculum/types';
import {
  countFreeTempoPositions,
  matchBothHandsSlot,
  midiPitchClass,
  partitionPlayedForBothHandsLegato,
} from './freeTempoSlotMatch';

function sessionEx(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    exerciseId: 'C-pentascale-major',
    stageId: 'C-pentascale-major-p3',
    key: 'C',
    kind: 'pentascale-major',
    hand: 'both',
    bpm: 0,
    useMetronome: false,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    purpose: undefined,
    ...overrides,
  };
}

describe('matchBothHandsSlot', () => {
  it('accepts RH+LH C when written as C4 + C3 together', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const { ok, wrongNotes } = matchBothHandsSlot(score!, 0, 0, [60, 48]);
    expect(ok).toBe(true);
    expect(wrongNotes.length).toBe(0);
  });

  it('trims extra same-class keys toward the chord center then pairs low→high', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const { ok, consumedMidi } = matchBothHandsSlot(score!, 0, 0, [48, 60, 72]);
    expect(ok).toBe(true);
    expect(consumedMidi.sort((a, b) => a - b)).toEqual([48, 60]);
  });

  it('accepts RH-then-LH order in the played set (staggered)', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const { ok } = matchBothHandsSlot(score!, 0, 0, [60, 48]);
    expect(ok).toBe(true);
  });

  it('fails until both chord tones are present', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const { ok } = matchBothHandsSlot(score!, 0, 0, [48]);
    expect(ok).toBe(false);
  });

  it('rejects wrong pitch class', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const { ok } = matchBothHandsSlot(score!, 0, 0, [60, 49]);
    expect(ok).toBe(false);
  });

  it('legato partition: LH C may stay down while RH+LH hit next D chord', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    const slotD = new Set([midiPitchClass(50)]);
    const residualC = new Set([midiPitchClass(48)]);
    const { foreignWrong, playedForChord } = partitionPlayedForBothHandsLegato(
      [48, 50, 62],
      slotD,
      residualC,
    );
    expect(foreignWrong.length).toBe(0);
    expect(playedForChord.sort((a, b) => a - b)).toEqual([50, 62]);
    const { ok } = matchBothHandsSlot(score!, 0, 1, playedForChord);
    expect(ok).toBe(true);
  });

  it('legato partition: unrelated pitch still counts as wrong', () => {
    const slotD = new Set([midiPitchClass(50)]);
    const residualC = new Set([midiPitchClass(48)]);
    const { foreignWrong } = partitionPlayedForBothHandsLegato([48, 50, 62, 64], slotD, residualC);
    expect(foreignWrong.map(midiPitchClass).sort()).toEqual([4]);
  });

  it('legato partition: RH single-note line — held C does not count as wrong for next D', () => {
    const slotD = new Set([midiPitchClass(62)]);
    const residualC = new Set([midiPitchClass(60)]);
    const { foreignWrong, playedForChord } = partitionPlayedForBothHandsLegato(
      [60, 62],
      slotD,
      residualC,
    );
    expect(foreignWrong.length).toBe(0);
    expect(playedForChord).toEqual([62]);
  });

  it('pairs each stave note with its own played MIDI (for score coloring)', () => {
    const score = generateScoreForExercise(sessionEx({}));
    expect(score).not.toBeNull();
    let slotMi = 0;
    let slotNi = 0;
    let found = false;
    for (let mi = 0; mi < score!.parts[0]!.measures.length && !found; mi++) {
      const nlen = Math.max(...score!.parts.map(p => p.measures[mi]!.notes.length));
      for (let ni = 0; ni < nlen && !found; ni++) {
        if (matchBothHandsSlot(score!, mi, ni, [48, 60]).ok) {
          slotMi = mi;
          slotNi = ni;
          found = true;
        }
      }
    }
    expect(found).toBe(true);
    const rh = score!.parts.find(p => p.hand === 'right')!.measures[slotMi]!.notes[slotNi]!;
    const lh = score!.parts.find(p => p.hand === 'left')!.measures[slotMi]!.notes[slotNi]!;
    const r = matchBothHandsSlot(score!, slotMi, slotNi, [48, 60]);
    expect(r.ok).toBe(true);
    expect(r.perNote).toHaveLength(2);
    const byId = Object.fromEntries(r.perNote.map(p => [p.noteId, p]));
    expect(byId[lh.id]!.playedMidi).toBe(48);
    expect(byId[rh.id]!.playedMidi).toBe(60);
  });
});

describe('countFreeTempoPositions', () => {
  it('matches LH C pentascale playable count', () => {
    const score = generateScoreForExercise(
      sessionEx({ stageId: 'C-pentascale-major-p2', hand: 'left' }),
    );
    expect(score).not.toBeNull();
    expect(countFreeTempoPositions(score!)).toBeGreaterThan(3);
  });
});
