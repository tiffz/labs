import { describe, expect, it } from 'vitest';
import { navigateEncore, parseEncoreAppHash } from './encoreAppHash';

describe('parseEncoreAppHash', () => {
  it('parses performances', () => {
    expect(parseEncoreAppHash('#/performances')).toEqual({ kind: 'performances' });
  });

  it('parses library', () => {
    expect(parseEncoreAppHash('#/library')).toEqual({ kind: 'library' });
  });
});

describe('navigateEncore', () => {
  it('sets hash for performances without throwing', () => {
    navigateEncore({ kind: 'performances' });
    expect(window.location.hash).toBe('#/performances');
  });

  afterAll(() => {
    navigateEncore({ kind: 'library' });
  });
});
