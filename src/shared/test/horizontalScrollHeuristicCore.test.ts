import { describe, expect, it } from 'vitest';
import { evaluateHorizontalScrollOverflow } from './horizontalScrollHeuristicCore';

describe('evaluateHorizontalScrollOverflow', () => {
  it('passes when scroll width matches client width', () => {
    expect(evaluateHorizontalScrollOverflow(800, 800)).toEqual({ ok: true });
  });

  it('passes within tolerance', () => {
    expect(evaluateHorizontalScrollOverflow(801, 800, 1)).toEqual({ ok: true });
  });

  it('flags overflow beyond tolerance', () => {
    expect(evaluateHorizontalScrollOverflow(820, 800)).toEqual({
      ok: false,
      overflowPx: 20,
      scrollWidth: 820,
      clientWidth: 800,
    });
  });
});
