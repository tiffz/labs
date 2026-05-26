import { describe, expect, it } from 'vitest';
import { originalTakeDisplayName, originalTakeListenHint } from './originalsTakeDisplay';

describe('originalTakeDisplayName', () => {
  it('strips common audio extensions', () => {
    expect(originalTakeDisplayName('Meet Me On The Moon - May 23.m4a')).toBe('Meet Me On The Moon - May 23');
  });
});

describe('originalTakeListenHint', () => {
  it('labels preferred takes', () => {
    expect(
      originalTakeListenHint(
        { id: '1', label: 'demo.mp3', timestamp: 0, source: 'imported' },
        true,
      ),
    ).toBe('Preferred demo · demo');
  });
});
