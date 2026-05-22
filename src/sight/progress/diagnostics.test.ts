import { describe, expect, it } from 'vitest';
import { evaluateDeficiencies, shouldClearFocus } from './diagnostics';
import type { RepRecord } from './types';

function rep(partial: Partial<RepRecord> & Pick<RepRecord, 'passed' | 'tags'>): RepRecord {
  return {
    at: '2026-01-01',
    level: 8,
    module: 'flashcard',
    kind: 'flashcard-albers',
    skillVector: 'relationalDecoding',
    purpose: 'curriculum',
    ...partial,
  };
}

describe('diagnostics', () => {
  it('detects warm value blindness pattern', () => {
    const reps: RepRecord[] = [];
    for (let i = 0; i < 6; i++) {
      reps.push(
        rep({
          passed: true,
          tags: ['kind:flashcard-isolated', 'axis:lighter'],
        }),
      );
    }
    for (let i = 0; i < 6; i++) {
      reps.push(
        rep({
          passed: false,
          tags: ['warm-bg', 'kind:flashcard-albers'],
        }),
      );
    }
    const diag = evaluateDeficiencies(reps);
    expect(diag?.id).toBe('WARM_VALUE_BLINDNESS');
  });

  it('clears focus after enough passing focus reps', () => {
    const reps = Array.from({ length: 5 }, () =>
      rep({ passed: true, purpose: 'focus', tags: [] }),
    );
    expect(shouldClearFocus(reps)).toBe(true);
  });
});
