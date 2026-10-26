// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { measureLayoutOf, parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { ParsedRhythm, TimeSignature } from '../types';
import { useRhythmSelection } from './useRhythmSelection';

/**
 * Every drawn note, every edit, checked against an oracle that does not use the editing code.
 *
 * The oracle edits the PARSED rhythm (change one note, or reorder one measure) and compares the
 * result with a parse of the string the hook wrote. Hand-picked single cases missed two bugs
 * that this sweep found on its first run: replacing the note after a space replaced the note
 * before it, and every edit after a tie across a barline landed on the tied note.
 *
 * Fixtures cover the dimensions the bugs lived in: meter length, section and measure repeats,
 * `%`, ties, spaces between groups, and measures padded by an implicit rest.
 */
const FIXTURES: Array<[string, string, TimeSignature]> = [
  ['two x2 sections, 2/4', '|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| TKD-TKTK:|x2', { numerator: 2, denominator: 4 }],
  ['plain 4/4 with barline', 'D-T-K-T-D---T---|T-K-D-T-____D---', { numerator: 4, denominator: 4 }],
  ['measure repeat |x3', 'D-TKD-T-D-TKD-T- |x3 T-K-T-K-D---D---', { numerator: 4, denominator: 4 }],
  ['simile %', 'D-T-D-T-K-K-K-K-|%|T---T---T---T---', { numerator: 4, denominator: 4 }],
  ['6/8 section x3', '|: D--T--K--T-- :|x3 D-----T-----', { numerator: 6, denominator: 8 }],
  ['section without count, spaces, 2/4', 'DKTK D-T- |: TKTK D--- :| K-K-D---', { numerator: 2, denominator: 4 }],
  ['tie across a barline, 2/4', 'T-D---------K---', { numerator: 2, denominator: 4 }],
  ['tie over a whole measure, 2/4', 'T-D-------------K-------', { numerator: 2, denominator: 4 }],
  ['tie from a measure start, 4/4', 'D-----------------T-------------', { numerator: 4, denominator: 4 }],
  ['ties and spaces, 2/4', 'TK D---- K-T- D-', { numerator: 2, denominator: 4 }],
  ['short last measure', 'D-T-K-T-D---T---|D-T-', { numerator: 4, denominator: 4 }],
  ['short measure before a barline', 'D-T-|K-K-K-K-K-K-K-K-', { numerator: 4, denominator: 4 }],
];

type Hook = ReturnType<typeof useRhythmSelection>;

interface DrawnNote {
  fixture: string;
  notation: string;
  ts: TimeSignature;
  parsed: ParsedRhythm;
  measure: number;
  note: number;
  /** Drawn-score tick, as the renderer reports it. */
  pos: number;
  duration: number;
  sound: string;
  measureStart: number;
  /** A rest closing its measure may be padding the parser added; it is not in the string. */
  mayBeImplicit: boolean;
}

function drawnNotes(): DrawnNote[] {
  const out: DrawnNote[] = [];
  for (const [fixture, notation, ts] of FIXTURES) {
    const parsed = parseRhythm(notation, ts);
    const layout = measureLayoutOf(parsed);
    const isSimile = (i: number) =>
      (parsed.repeats ?? []).some((r) => r.type === 'measure' && r.repeatMeasures.includes(i));
    for (const slot of layout) {
      // Hidden copies have no drawn notes; `%` measures are one simile glyph, not notes.
      if (slot.visualStartTick === null || isSimile(slot.index)) continue;
      const notes = parsed.measures[slot.index].notes;
      let offset = 0;
      notes.forEach((n, k) => {
        const pos = slot.visualStartTick! + offset;
        offset += n.durationInSixteenths;
        // Clicking a tied part selects the whole tie group, which the oracle does not model.
        if (n.isTiedFrom || n.isTiedTo) return;
        out.push({
          fixture, notation, ts, parsed, measure: slot.index, note: k, pos,
          duration: n.durationInSixteenths, sound: n.sound, measureStart: slot.visualStartTick!,
          mayBeImplicit: n.sound === 'rest' && k === notes.length - 1,
        });
      });
    }
  }
  return out;
}

function edit(notation: string, ts: TimeSignature, ...steps: Array<(h: Hook) => void>): string | null {
  let written: string | null = null;
  const hook = renderHook(() =>
    useRhythmSelection({
      notation,
      timeSignature: ts,
      addToHistory: () => {},
      setNotationWithoutHistory: (next) => { written = next; },
      noteDisplayRef: { current: document.createElement('div') },
      parsedRhythm: parseRhythm(notation, ts),
    }),
  );
  for (const step of steps) act(() => step(hook.result.current));
  hook.unmount();
  return written;
}

const signature = (measures: ParsedRhythm['measures']) =>
  measures.map((m) => m.notes.map((n) => `${n.sound}:${n.durationInSixteenths}`).join(' ')).join(' | ');

const label = (n: DrawnNote) => `${n.fixture}: measure ${n.measure + 1}, note ${n.note + 1} (${n.notation})`;

const NOTES = drawnNotes();

describe('editing every drawn note', () => {
  it('covers notes in every fixture', () => {
    expect(new Set(NOTES.map((n) => n.fixture)).size).toBe(FIXTURES.length);
  });

  it('replace changes that note, and its repeat copies, and nothing else', () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      const replacement = n.sound === 'slap' ? 'tak' : 'slap';
      const pattern = (replacement === 'slap' ? 'S' : 'T') + '-'.repeat(n.duration - 1);
      const out = edit(n.notation, n.ts,
        (h) => h.handleSelectionChange(n.pos, n.pos + n.duration, n.duration),
        (h) => h.handleReplaceSelection(pattern));
      const layout = measureLayoutOf(n.parsed);
      const expected = n.parsed.measures.map((m, j) =>
        layout[j].sourceIndex !== n.measure ? m : {
          ...m,
          notes: m.notes.map((note, k) => (k === n.note ? { ...note, sound: replacement } : note)),
        });
      const got = out === null ? 'no edit' : signature(parseRhythm(out, n.ts).measures);
      if (got !== signature(expected as ParsedRhythm['measures'])) failures.push(`${label(n)} → ${out}`);
    }
    expect(failures).toEqual([]);
  });

  it('delete removes exactly that note from the string', () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      const out = edit(n.notation, n.ts,
        (h) => h.handleSelectionChange(n.pos, n.pos + n.duration, n.duration),
        (h) => h.handleDeleteSelection());
      if ((out === null || out === n.notation) && n.mayBeImplicit) continue;
      if (out === null) { failures.push(`${label(n)} → no edit`); continue; }
      let a = 0;
      while (a < out.length && out[a] === n.notation[a]) a++;
      let b = 0;
      while (b < out.length - a && out[out.length - 1 - b] === n.notation[n.notation.length - 1 - b]) b++;
      const removed = n.notation.slice(a, n.notation.length - b);
      const removedNote = parseRhythm(removed.replace(/\s/g, ''), { numerator: 16, denominator: 4 })
        .measures.flatMap((m) => m.notes)
        .filter((note) => !(note.sound === 'rest' && note.durationInSixteenths !== n.duration));
      const ok = !/[|:x%]/.test(removed)
        && removedNote.length === 1
        && removedNote[0].sound === n.sound
        && removedNote[0].durationInSixteenths === n.duration;
      if (!ok) failures.push(`${label(n)} → removed ${JSON.stringify(removed)}`);
    }
    expect(failures).toEqual([]);
  });

  it('moving a note to the start of its measure reorders only that measure', () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      if (n.note === 0) continue;
      const out = edit(n.notation, n.ts,
        (h) => h.handleMoveSelection(n.pos, n.pos + n.duration, n.measureStart));
      if ((out === null || out === n.notation) && n.mayBeImplicit) continue;
      const layout = measureLayoutOf(n.parsed);
      const expected = n.parsed.measures.map((m, j) => {
        if (layout[j].sourceIndex !== n.measure) return m;
        const notes = [...m.notes];
        const [moved] = notes.splice(n.note, 1);
        return { ...m, notes: [moved, ...notes] };
      });
      const got = out === null ? 'no edit' : signature(parseRhythm(out, n.ts).measures);
      if (got !== signature(expected)) failures.push(`${label(n)} → ${out}`);
    }
    expect(failures).toEqual([]);
  });
});
