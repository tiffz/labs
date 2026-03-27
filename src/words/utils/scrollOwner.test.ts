import { describe, it, expect } from 'vitest';
import { getNotationScrollContainer } from './scrollOwner';

describe('getNotationScrollContainer', () => {
  it('returns the notation scroll container even when not overflowing yet', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 100, configurable: true });

    expect(getNotationScrollContainer(container)).toBe(container);
  });

  it('returns null when notation container is unavailable', () => {
    expect(getNotationScrollContainer(null)).toBeNull();
  });
});
