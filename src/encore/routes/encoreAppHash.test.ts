import { describe, expect, it } from 'vitest';
import { encoreAppHref, navigateEncore, parseEncoreAppHash } from './encoreAppHash';

describe('parseEncoreAppHash', () => {
  it('parses performances list and wrapped stats', () => {
    expect(parseEncoreAppHash('#/performances')).toEqual({ kind: 'performances', tab: 'list' });
    expect(parseEncoreAppHash('#/performances/wrapped')).toEqual({ kind: 'performances', tab: 'wrapped' });
    expect(parseEncoreAppHash('#/performances/stats')).toEqual({ kind: 'performances', tab: 'wrapped' });
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

describe('encoreAppHref', () => {
  it('matches navigateEncore hash targets', () => {
    expect(encoreAppHref({ kind: 'library' })).toBe('#/library');
    expect(encoreAppHref({ kind: 'practice' })).toBe('#/practice');
    expect(encoreAppHref({ kind: 'performances' })).toBe('#/performances');
    expect(encoreAppHref({ kind: 'performances', tab: 'wrapped' })).toBe('#/performances/wrapped');
    expect(encoreAppHref({ kind: 'repertoireSettings' })).toBe('#/settings/repertoire');
    expect(encoreAppHref({ kind: 'help' })).toBe('#/help');
    expect(encoreAppHref({ kind: 'songNew' })).toBe('#/song/new');
    expect(encoreAppHref({ kind: 'song', id: 'ab/cd' })).toBe(`#/song/${encodeURIComponent('ab/cd')}`);
  });
});

describe('navigateEncore', () => {
  it('sets hash for performances list and wrapped', () => {
    navigateEncore({ kind: 'performances' });
    expect(window.location.hash).toBe('#/performances');
    navigateEncore({ kind: 'performances', tab: 'wrapped' });
    expect(window.location.hash).toBe('#/performances/wrapped');
  });

  it('sets hash for help', () => {
    navigateEncore({ kind: 'help' });
    expect(window.location.hash).toBe('#/help');
  });

  afterAll(() => {
    navigateEncore({ kind: 'library' });
  });
});
