import { describe, expect, it } from 'vitest';
import { parseOptionalNumberParam } from './urlParams';

describe('urlParams utilities', () => {
  it('returns null when param is missing', () => {
    expect(parseOptionalNumberParam(null)).toBeNull();
  });

  it('parses explicit numeric values, including zero', () => {
    expect(parseOptionalNumberParam('0')).toBe(0);
    expect(parseOptionalNumberParam('58')).toBe(58);
    expect(parseOptionalNumberParam('100')).toBe(100);
  });

  it('returns null for non-numeric values', () => {
    expect(parseOptionalNumberParam('abc')).toBeNull();
    expect(parseOptionalNumberParam('')).toBeNull();
  });
});
