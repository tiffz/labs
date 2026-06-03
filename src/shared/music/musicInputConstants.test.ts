import { describe, expect, it } from 'vitest';
import { transposeMusicKey } from './musicInputConstants';

describe('transposeMusicKey', () => {
  it('transposes within the 12-key display set', () => {
    expect(transposeMusicKey('C', 2)).toBe('D');
    expect(transposeMusicKey('F', -2)).toBe('Eb');
    expect(transposeMusicKey('Bb', 1)).toBe('B');
  });
});
