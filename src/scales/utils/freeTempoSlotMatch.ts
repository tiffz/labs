import type { PianoScore } from '../../shared/music/scoreTypes';
import { pitchClassDistance } from '../../shared/practice/pitchMatch';
import { advanceFreeTempoCursor } from './freeTempoCursorStep';

const OCTAVE_SLACK_SEMITONES = 12;

export type BothHandsPerNoteMatch = {
  noteId: string;
  expectedMidi: number;
  playedMidi: number;
};

export type MatchBothHandsSlotResult = {
  ok: boolean;
  wrongNotes: number[];
  consumedMidi: number[];
  /** Populated when `ok`; each score note gets its own played pitch for grading UI. */
  perNote: BothHandsPerNoteMatch[];
};

/**
 * Counts how many score positions require a successful hit before a free-tempo
 * run completes (same walk as {@link advanceFreeTempoCursor}).
 */
export function countFreeTempoPositions(score: PianoScore): number {
  let mi = 0;
  let ni = 0;
  let total = 0;
  const visited = new Set<string>();
  for (;;) {
    const key = `${mi},${ni}`;
    if (visited.has(key)) {
      throw new Error('free-tempo cursor cycle while counting positions');
    }
    visited.add(key);
    const hasPlayable = score.parts.some(p => {
      const note = p.measures[mi]?.notes[ni];
      return note && !note.rest;
    });
    if (hasPlayable) total++;
    const stepped = advanceFreeTempoCursor(score, mi, ni);
    if (stepped.kind === 'complete') return total;
    mi = stepped.measureIndex;
    ni = stepped.noteIndex;
  }
}

/** MIDI note number → chromatic pitch class 0–11. */
export function midiPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/**
 * Split MIDI keys for both-hands free tempo: notes that belong to the
 * current chord vs "held over" from the previous slot vs truly wrong.
 * Matching should use {@link playedForChord} only; {@link foreignWrong}
 * should reset the probe / flash the user.
 */
export function partitionPlayedForBothHandsLegato(
  played: number[],
  slotPitchClasses: Set<number>,
  residualPitchClasses: Set<number>,
): { foreignWrong: number[]; playedForChord: number[] } {
  const foreignWrong = played.filter(p => {
    const pc = midiPitchClass(p);
    return !slotPitchClasses.has(pc) && !residualPitchClasses.has(pc);
  });
  const playedForChord = played.filter(p => slotPitchClasses.has(midiPitchClass(p)));
  return { foreignWrong, playedForChord };
}

function fail(played: number[], unionPc: Set<number>): MatchBothHandsSlotResult {
  return {
    ok: false,
    wrongNotes: played.filter(p => !unionPc.has(midiPitchClass(p))),
    consumedMidi: [],
    perNote: [],
  };
}

/**
 * Match both-hands slots: expected notes are sorted low→high (LH then RH on
 * the staff), played MIDI is sorted the same way, and we pair by index after
 * optionally trimming extra same-class keys toward the chord's pitch center.
 *
 * Returns {@link MatchBothHandsSlotResult.perNote} so callers can attach the
 * correct played MIDI to each stave note (not the whole chord to every note).
 */
export function matchBothHandsSlot(
  score: PianoScore,
  measureIndex: number,
  noteIndex: number,
  played: number[],
): MatchBothHandsSlotResult {
  const slots: { noteId: string; hand: 'right' | 'left'; expectedMidi: number }[] = [];
  for (const part of score.parts) {
    if (part.hand !== 'right' && part.hand !== 'left') continue;
    const note = part.measures[measureIndex]?.notes[noteIndex];
    if (!note || note.rest) continue;
    for (const ep of note.pitches) {
      slots.push({ noteId: note.id, hand: part.hand, expectedMidi: ep });
    }
  }

  if (slots.length === 0) {
    return {
      ok: false,
      wrongNotes: [...played],
      consumedMidi: [],
      perNote: [],
    };
  }

  const expSorted = [...slots].sort((a, b) => a.expectedMidi - b.expectedMidi);
  const unionPc = new Set(expSorted.map(s => midiPitchClass(s.expectedMidi)));

  const poolPc = [...new Set(played)]
    .filter(p => unionPc.has(midiPitchClass(p)))
    .sort((a, b) => a - b);

  if (poolPc.length < expSorted.length) {
    return fail(played, unionPc);
  }

  let chosen = poolPc;
  if (poolPc.length > expSorted.length) {
    const k = expSorted.length;
    const mid =
      (expSorted[0]!.expectedMidi + expSorted[k - 1]!.expectedMidi) / 2;
    chosen = [...poolPc]
      .sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))
      .slice(0, k)
      .sort((a, b) => a - b);
  }

  const consumed: number[] = [];
  for (let i = 0; i < expSorted.length; i++) {
    const exp = expSorted[i]!.expectedMidi;
    const midi = chosen[i]!;
    if (pitchClassDistance(midi, exp) !== 0) {
      return fail(played, unionPc);
    }
    if (Math.abs(midi - exp) > OCTAVE_SLACK_SEMITONES) {
      return fail(played, unionPc);
    }
    consumed.push(midi);
  }

  const wrongNotes = played.filter(p => !unionPc.has(midiPitchClass(p)));
  if (wrongNotes.length > 0) {
    return { ok: false, wrongNotes, consumedMidi: [], perNote: [] };
  }

  const perNote: BothHandsPerNoteMatch[] = expSorted.map((slot, i) => ({
    noteId: slot.noteId,
    expectedMidi: slot.expectedMidi,
    playedMidi: chosen[i]!,
  }));

  return { ok: true, wrongNotes: [], consumedMidi: consumed, perNote };
}
