import { describe, expect, it } from 'vitest';
import { autoAdvanceDelayMs } from './practiceAutoAdvance';

describe('autoAdvanceDelayMs', () => {
  it('gives longer delay on fail', () => {
    const pass = autoAdvanceDelayMs(
      { kind: 'compare', challenge: {} as never, pickedSide: 'left', passed: true },
      false,
    );
    const fail = autoAdvanceDelayMs(
      { kind: 'compare', challenge: {} as never, pickedSide: 'left', passed: false },
      false,
    );
    expect(fail).toBeGreaterThan(pass);
  });
});
