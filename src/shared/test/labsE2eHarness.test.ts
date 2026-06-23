import { describe, expect, it } from 'vitest';
import { isLabsE2eHarness } from './labsE2eHarness';

describe('isLabsE2eHarness', () => {
  it('is true in Vitest (MODE=test)', () => {
    expect(isLabsE2eHarness()).toBe(true);
  });
});
