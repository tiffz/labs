import { describe, expect, it } from 'vitest';
import { navigateEncore, parseEncoreAppHash } from './encoreAppHash';

describe('parseEncoreAppHash', () => {
  it('parses performances', () => {
    expect(parseEncoreAppHash('#/performances')).toEqual({ kind: 'performances' });
  });

  it('parses library', () => {
    expect(parseEncoreAppHash('#/library')).toEqual({ kind: 'library' });
  });

  it('parses help and legacy import-guide URL', () => {
    expect(parseEncoreAppHash('#/help')).toEqual({ kind: 'help' });
    expect(parseEncoreAppHash('#/settings/repertoire/import-guide')).toEqual({ kind: 'help' });
    expect(parseEncoreAppHash('#/settings/repertoire')).toEqual({ kind: 'repertoireSettings' });
  });
});

describe('navigateEncore', () => {
  it('sets hash for performances without throwing', () => {
    navigateEncore({ kind: 'performances' });
    expect(window.location.hash).toBe('#/performances');
  });

  it('sets hash for help', () => {
    navigateEncore({ kind: 'help' });
    expect(window.location.hash).toBe('#/help');
  });

  afterAll(() => {
    navigateEncore({ kind: 'library' });
  });
});
