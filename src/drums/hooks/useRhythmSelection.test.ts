// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../types';
import { useRhythmSelection } from './useRhythmSelection';

const TWO_FOUR: TimeSignature = { numerator: 2, denominator: 4 };
/** The owner's report. Drawn ticks: m1 0..8, m2 8..16, m5 16..24, m6 24..32 (copies hidden). */
const TWO_SECTIONS = '|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| TKD-TKTK:|x2';

/**
 * Selections arrive in drawn-score (visual) ticks — what the renderer reports. Each test edits a
 * measure past the first section, which every old coordinate path resolved to the wrong place.
 */
function setup(notation: string, timeSignature: TimeSignature = TWO_FOUR) {
  let written: string | null = null;
  const noteDisplayRef = { current: document.createElement('div') };
  const hook = renderHook(() =>
    useRhythmSelection({
      notation,
      timeSignature,
      addToHistory: () => {},
      setNotationWithoutHistory: (next) => { written = next; },
      noteDisplayRef,
      parsedRhythm: parseRhythm(notation, timeSignature),
    }),
  );
  return { hook, result: () => written };
}

describe('useRhythmSelection across measures', () => {
  it('replaces a note in the final measure, not in the first section', () => {
    const { hook, result } = setup(TWO_SECTIONS);
    act(() => hook.result.current.handleSelectionChange(24, 25, 1));
    act(() => hook.result.current.handleReplaceSelection('S'));
    expect(result()).toBe('|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| SKD-TKTK:|x2');
  });

  it('replaces a note at the start of measure 2 in 2/4 without repeats', () => {
    const { hook, result } = setup('DKTKD-TK|D-TKTKTK|TKD-TKTK');
    act(() => hook.result.current.handleSelectionChange(8, 10, 2));
    act(() => hook.result.current.handleReplaceSelection('T-'));
    expect(result()).toBe('DKTKD-TK|T-TKTKTK|TKD-TKTK');
  });

  it('deletes a whole measure before a repeat sign without eating the repeat sign', () => {
    const { hook, result } = setup(TWO_SECTIONS);
    act(() => hook.result.current.handleSelectionChange(8, 16, 8));
    act(() => hook.result.current.handleDeleteSelection());
    const next = result();
    expect(next).not.toBeNull();
    expect(next!.match(/:\|x2/g)).toHaveLength(2);
    expect(next).toContain('|: DKTKD-TK| TKD-TKTK:|x2');
    expect(next).not.toContain('D-TKTKTK');
  });

  it('moves a note within the final measure', () => {
    const { hook, result } = setup(TWO_SECTIONS);
    act(() => hook.result.current.handleMoveSelection(24, 25, 28));
    expect(result()).toBe('|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| KD-TTKTK:|x2');
  });
});
