import { describe, expect, it } from 'vitest';
import { measureLayoutOf, parseRhythm } from '../../shared/rhythm/rhythmParser';
import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import { generateRhythm, rngFrom } from '../test/rhythmFuzz';
import type { TimeSignature } from '../types';
import { setStrokeAt } from './notationEdits';
import { notationToGrid } from './sequencerUtils';

type SequencerCell = 'dum' | 'tak' | 'ka' | 'slap' | 'rest';

/**
 * Random rhythms × random sequencer clicks.
 *
 * The grid shows the played timeline, one row per sixteenth, copies included. A darbuka stroke is
 * percussive, so what a click must change is which stroke STARTS where. The oracle: the clicked
 * cell, and its copies when it sits in a written measure (linked editing), gain or lose that
 * stroke; a click in a copy changes that copy alone; no other onset moves.
 *
 * Linked cells come from the measure layout, computed here, not from the editing code.
 */

/** Played tick → stroke that starts there. Rests and parser padding are not strokes. */
function onsets(notation: string, ts: TimeSignature): Map<number, string> {
  const out = new Map<number, string>();
  let tick = 0;
  for (const measure of parseRhythm(notation, ts).measures) {
    for (const note of measure.notes) {
      if (!note.isTiedFrom && note.sound !== 'rest') out.set(tick, note.sound);
      tick += note.durationInSixteenths;
    }
  }
  return out;
}

/** The strokes the grid draws: each non-rest cell is an onset. */
function gridOnsets(notation: string, ts: TimeSignature): Map<number, string> {
  const out = new Map<number, string>();
  notationToGrid(notation, ts).cells.forEach((cell, tick) => {
    if (cell !== null && cell !== 'rest') out.set(tick, cell);
  });
  return out;
}

const show = (m: Map<number, string>) => [...m].sort((a, b) => a[0] - b[0]).map(([t, s]) => `${t}:${s[0]}`).join(' ');

const SOUNDS: SequencerCell[] = ['dum', 'tak', 'ka', 'slap', 'rest'];
const RHYTHMS = Number(process.env.DRUMS_FUZZ_SEEDS) || 300;
const CLICKS_PER_RHYTHM = 5;

function runSeed(seed: number): string | null {
  const rng = rngFrom(seed * 7919);
  const { notation: start, ts } = generateRhythm(rngFrom(seed));
  if (!parseRhythm(start, ts).isValid) return null;
  const spm = getSixteenthsPerMeasure(ts);
  let notation = start;

  for (let step = 0; step < CLICKS_PER_RHYTHM; step++) {
    const parsed = parseRhythm(notation, ts);
    const layout = measureLayoutOf(parsed);
    const played = layout.reduce((t, s) => t + s.durationTicks, 0);
    if (played === 0) return null;
    const position = rng.int(0, played - 1);
    const sound = rng.pick(SOUNDS);
    const measure = Math.floor(position / spm);
    const offset = position - measure * spm;
    const slot = layout[measure];
    const isCopy = slot.isHidden || slot.sourceIndex !== slot.index;
    const targets = isCopy
      ? [position]
      : layout.filter((s) => s.sourceIndex === slot.index).map((s) => s.logicalStartTick + offset);

    const before = onsets(notation, ts);
    // The grid must draw what plays, or a click aims at a stroke that is not where it looks.
    const drawn = gridOnsets(notation, ts);
    if (show(drawn) !== show(before)) {
      return `seed ${seed} step ${step}: the grid draws different strokes than play\n  ${notation}\n  plays: ${show(before)}\n  grid:  ${show(drawn)}`;
    }
    const removing = before.get(position) === sound;
    const expected = new Map(before);
    for (const t of targets) {
      if (removing || sound === 'rest') expected.delete(t);
      else expected.set(t, sound as string);
    }

    let next: string;
    try {
      // A click on the stroke already there clears it, as the grid does.
      next = setStrokeAt(notation, ts, position, removing ? null : sound) ?? notation;
    } catch (error) {
      return `seed ${seed} step ${step}: threw ${(error as Error).message}\n  ${notation}`;
    }
    const where = `seed ${seed} step ${step} (${ts.numerator}/${ts.denominator}) ${removing ? 'remove' : 'set'} ${sound} @${position}${isCopy ? ' (copy)' : ''}\n  before: ${notation}\n  after:  ${next}`;
    if (next.trim() && !parseRhythm(next, ts).isValid) return `${where}\n  result does not parse`;
    const got = onsets(next, ts);
    if (show(got) !== show(expected)) return `${where}\n  expected: ${show(expected)}\n  got:      ${show(got)}`;
    notation = next;
  }
  return null;
}

describe('sequencer clicks under random rhythms', () => {
  it('a click changes the stroke at that cell and its linked copies, and nothing else', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= RHYTHMS; seed++) {
      const failure = runSeed(seed);
      if (failure) failures.push(failure);
    }
    expect({ failed: failures.length, first: failures.slice(0, 5) }).toEqual({ failed: 0, first: [] });
  });
});
