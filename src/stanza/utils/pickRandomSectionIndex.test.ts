import { describe, expect, it } from 'vitest';
import { pickRandomSectionIndex } from './pickRandomSectionIndex';

describe('pickRandomSectionIndex', () => {
  it('returns null when fewer than two sections', () => {
    expect(pickRandomSectionIndex(0)).toBeNull();
    expect(pickRandomSectionIndex(1)).toBeNull();
  });

  it('returns an in-range index for two or more sections', () => {
    expect(pickRandomSectionIndex(3, () => 0)).toBe(0);
    expect(pickRandomSectionIndex(3, () => 0.99)).toBe(2);
    expect(pickRandomSectionIndex(5, () => 0.4)).toBe(2);
  });
});
