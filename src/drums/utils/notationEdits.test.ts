import { describe, expect, it } from 'vitest';
import { buildMeasureLayout } from '../../shared/rhythm/measureLayout';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../types';
import { copyRange, deleteLastNote, deleteRange, dropPattern, moveRange, replaceRange, setStrokeAt } from './notationEdits';

/**
 * Every bug `notationEdits.fuzz.test.ts` has found, pinned as a named case.
 *
 * Some took 20,000-100,000 random rhythms to surface once. A fixed case keeps each one covered
 * however few seeds the default run uses. Expected strings are worked out by hand from what the
 * user aimed at, not copied from the editor's output.
 */

const ts = (numerator: number, denominator: number): TimeSignature => ({ numerator, denominator });
const notesOf = (notation: string, t: TimeSignature) =>
  parseRhythm(notation, t).measures.map((m) => m.notes.map((n) => `${n.sound[0]}${n.durationInSixteenths}`).join(' '));

describe('parser bugs the fuzz found', () => {
  it('a % is a whole measure of its own meter, not 4/4\'s 16 sixteenths', () => {
    // 6/8 = 12 sixteenths. Counting the % as 16 put every measure after it 4 ticks late.
    const n = 'K-------T-D_|% | S---S---S---';
    expect(notesOf(n, ts(6, 8))).toEqual(['k8 t2 d1 r1', 'k8 t2 d1 r1', 's4 s4 s4']);
    expect(replaceRange(n, ts(6, 8), { start: 24, end: 28 }, 'D---')).toBe('K-------T-D_|% | D---S---S---');
  });

  it('an |x2 after an x3 section repeats its own measure, not the section\'s hidden passes', () => {
    const parsed = parseRhythm('|: D-D---T-| T-D-KKK- :|x3 | T_T-T--- |x2', ts(2, 4));
    expect(parsed.repeats?.find((r) => r.type === 'measure')).toEqual({ type: 'measure', sourceMeasure: 6, repeatMeasures: [7] });
  });

  it('|: is a barline: a short measure before it is padded, not filled by the section', () => {
    expect(notesOf('D-T- |: K-K-K-K-K-K-K-K- :|x2', ts(4, 4))).toEqual([
      'd2 t2 r12',
      'k2 k2 k2 k2 k2 k2 k2 k2',
      'k2 k2 k2 k2 k2 k2 k2 k2',
    ]);
  });

  it('an |x2 block with a note across its barline repeats the whole block', () => {
    // 7/8 = 14. The block is 18 ticks, so its T- crosses the bar. Splitting it anyway repeated an
    // empty string.
    expect(notesOf('| T-----DT- T DD-T-T-- |x2', ts(7, 8))).toEqual([
      't6 d1 t2 t1 d1 d2 t1', 't1 t3 r10', 't6 d1 t2 t1 d1 d2 t1', 't1 t3 r10',
    ]);
  });

  it('|x2 positions count from the trimmed content: an insert after a tie lands after it', () => {
    // Insert before the T-- (drawn tick 15 of the block's second measure, 14 + 1). Positions in an
    // |xN block were one character early, so this split the tied T- instead.
    const n = '| T-----DT- T DD-T-T-- |x2';
    expect(dropPattern(n, ts(7, 8), 'K-', 15, 'insert')).toBe('| T-----DT- T DD-T-K-T-- |x2');
  });

  it('the layout follows a % after a section through to the measure it plays', () => {
    const layout = buildMeasureLayout(parseRhythm('|: S-D-T- :|x3 | |%', ts(7, 8)));
    expect(layout.at(-1)?.sourceIndex).toBe(0);
  });
});

describe('editing a % or |xN copy', () => {
  it('writes out a % copy and edits only it', () => {
    expect(replaceRange('DKTKD-TK|%', ts(2, 4), { start: 8, end: 9 }, 'S')).toBe('DKTKD-TK|SKTKD-TK');
  });

  it('a % after the edited copy keeps playing the original', () => {
    expect(replaceRange('D-------|%|%', ts(2, 4), { start: 8, end: 16 }, 'S-T-D-K-')).toBe('D-------|S-T-D-K-|D-------');
  });

  it('writes out an |x3 as two copies, not three', () => {
    // x3 is three plays in total: the source and two copies. Edit the first copy.
    const next = replaceRange('| D-T-K-T- |x3', ts(2, 4), { start: 8, end: 10 }, 'S-');
    expect(next).toBe('| D-T-K-T- | S-T-K-T- | D-T-K-T-');
    expect(notesOf(next!, ts(2, 4))).toHaveLength(3);
  });

  it('a drop on a % applies, so the preview may offer it', () => {
    expect(dropPattern('DKTKD-TK|%', ts(2, 4), 'S', 8, 'replace')).toBe('DKTKD-TK|SKTKD-TK');
  });
});

describe('range edits keep the structure around the notes', () => {
  it('a delete crossing a section start keeps the |:', () => {
    // T (last note before the section) and S- (first inside it).
    const n = 'D-T-K-T-D-T-K--T |: S-DS---T------- :|x2';
    expect(deleteRange(n, ts(4, 4), { start: 15, end: 18 })).toBe('D-T-K-T-D-T-K-- |: DS---T------- :|x2');
  });

  it('replacing across a tied note keeps the far half and gives it a head', () => {
    // 2/4: D is tied 6 + 4 across the bar. Replace the first half of measure 2 only.
    expect(replaceRange('T-D---------K---', ts(2, 4), { start: 8, end: 12 }, 'S---')).toBe('T-D-----S---K---');
  });

  it('deleting the notes a % repeats removes the %', () => {
    expect(deleteRange('D-------|K-------|%', ts(2, 4), { start: 8, end: 16 })).toBe('D-------|');
  });

  it('deleting every note of a section removes the section', () => {
    expect(deleteRange('D-T- |: K-K- :|x2', ts(1, 4), { start: 4, end: 8 })).toBe('D-T- ');
  });

  it('moving padding the parser added changes nothing', () => {
    // 4/4: D-T- is padded with a 12-tick rest that is not in the string.
    expect(moveRange('D-T-|K-K-K-K-K-K-K-K-', ts(4, 4), { start: 4, end: 16 }, 0)).toBeNull();
  });

  it('copying a tied note copies one note, not its two drawn halves', () => {
    expect(copyRange('T-D---------K---', ts(2, 4), { start: 2, end: 12 })).toBe('D---------');
  });

  it('copying does not copy padding as typed rests', () => {
    expect(copyRange('D-T-|K-K-K-K-K-K-K-K-', ts(4, 4), { start: 0, end: 16 })).toBe('D-T-');
  });
});

describe('Backspace (delete last note)', () => {
  it('keeps a closing repeat sign', () => {
    expect(deleteLastNote('|: D-T- :|x2')).toBe('|: D- :|x2');
  });

  it('removes a whole rest, not one tick of it', () => {
    expect(deleteLastNote('D-T-____')).toBe('D-T-');
  });

  it('removes a trailing %', () => {
    expect(deleteLastNote('D-T-K-T-|%')).toBe('D-T-K-T-');
  });

  it('removes a repeat it empties', () => {
    expect(deleteLastNote('D-T- | K-K- |x2'.replace('K-K-', 'K-'))).toBe('D-T-');
  });
});

describe('sequencer clicks (setStrokeAt, played ticks)', () => {
  const two = ts(2, 4);

  it('a stroke inside a held note splits it and holds for the rest', () => {
    expect(setStrokeAt('D-------', two, 4, 'tak')).toBe('D---T---');
  });

  it('clearing a stroke lets the note before it hold on', () => {
    expect(setStrokeAt('D-T-K-T-', two, 2, null)).toBe('D---K-T-');
  });

  it('clearing the first stroke after a bar leaves a rest: nothing can hold across the bar', () => {
    expect(setStrokeAt('D-T-K-T-|T-K-T-K-', two, 8, null)).toBe('D-T-K-T-|__K-T-K-');
  });

  it('clearing a rest lets the stroke before it hold over it', () => {
    expect(setStrokeAt('D-__T---', two, 2, null)).toBe('D---T---');
  });

  it('editing a written measure edits its repeat passes and keeps the sign', () => {
    expect(setStrokeAt('|: D-T-K-T- :|x2', two, 0, 'slap')).toBe('|: S-T-K-T- :|x2');
  });

  it('editing a hidden pass writes that pass out and edits it alone', () => {
    expect(setStrokeAt('|: D-T-K-T- :|x2', two, 8, 'slap')).toBe('|: D-T-K-T- :| | S-T-K-T-');
  });

  it('keeps the spaces between groups', () => {
    expect(setStrokeAt('DKTK D-T-', two, 4, 'slap')).toBe('DKTK S-T-');
  });

  it('a stroke in padding the parser added is preceded by rests up to it', () => {
    expect(setStrokeAt('D-T-|K-K-K-K-', two, 6, 'tak')).toBe('D-T-__T|K-K-K-K-');
  });

  it('a stroke past the end starts a new measure', () => {
    expect(setStrokeAt('D-T-K-T-', two, 10, 'dum')).toBe('D-T-K-T- | __D');
  });
});
