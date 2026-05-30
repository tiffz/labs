import { describe, expect, it } from 'vitest';
import {
  sampledPianoLoadCaption,
  sampledPianoLoadPercent,
} from './sampledPianoLoadState';

describe('sampledPianoLoadState', () => {
  it('derives percent and caption from load state', () => {
    expect(
      sampledPianoLoadCaption({ loading: true, loaded: 2, total: 10, ready: false }),
    ).toBe('Loading samples…');
    expect(
      sampledPianoLoadPercent({ loading: false, loaded: 10, total: 10, ready: true }),
    ).toBe(100);
    expect(
      sampledPianoLoadCaption({ loading: false, loaded: 10, total: 10, ready: true }),
    ).toBe('Ready');
  });
});
