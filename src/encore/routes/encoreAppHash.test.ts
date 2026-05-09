import { describe, expect, it } from 'vitest';
import {
  encoreAppHref,
  encoreHashPathOnlyFragment,
  getEncoreHashScrollTargetId,
  navigateEncore,
  parseEncoreAppHash,
} from './encoreAppHash';

describe('parseEncoreAppHash', () => {
  it('parses performances list and wrapped stats', () => {
    expect(parseEncoreAppHash('#/performances')).toEqual({ kind: 'performances', tab: 'list' });
    expect(parseEncoreAppHash('#/performances/wrapped')).toEqual({ kind: 'performances', tab: 'wrapped' });
    expect(parseEncoreAppHash('#/performances/stats')).toEqual({ kind: 'performances', tab: 'wrapped' });
  });

  it('parses library', () => {
    expect(parseEncoreAppHash('#/library')).toEqual({ kind: 'library' });
  });

  it('parses saved searches manage page', () => {
    expect(parseEncoreAppHash('#/saved-searches')).toEqual({ kind: 'savedSearches' });
  });

  it('parses practice with optional song id', () => {
    expect(parseEncoreAppHash('#/practice')).toEqual({ kind: 'practice' });
    expect(parseEncoreAppHash('#/practice/my-song')).toEqual({ kind: 'practice', songId: 'my-song' });
    expect(parseEncoreAppHash(`#/practice/${encodeURIComponent('a/b')}`)).toEqual({ kind: 'practice', songId: 'a/b' });
  });

  it('parses song route ignoring in-fragment ?scroll= query', () => {
    expect(parseEncoreAppHash('#/song/abc?scroll=encore-song-practice-heading')).toEqual({ kind: 'song', id: 'abc' });
    expect(parseEncoreAppHash(`#/song/${encodeURIComponent('a/b')}?scroll=x-1`)).toEqual({ kind: 'song', id: 'a/b' });
  });

  it('does not treat scroll on guest share hash', () => {
    expect(getEncoreHashScrollTargetId('#/share/fileId123?scroll=evil')).toBeUndefined();
    expect(parseEncoreAppHash('#/share/fileId123?scroll=evil')).toEqual({ kind: 'library' });
  });

  it('parses help and legacy import-guide URL', () => {
    expect(parseEncoreAppHash('#/help')).toEqual({ kind: 'help' });
    expect(parseEncoreAppHash('#/settings/repertoire/import-guide')).toEqual({ kind: 'help' });
    expect(parseEncoreAppHash('#/settings/repertoire')).toEqual({ kind: 'repertoireSettings' });
  });
});

describe('encoreHashPathOnlyFragment and getEncoreHashScrollTargetId', () => {
  it('strips scroll query for canonical hash', () => {
    expect(encoreHashPathOnlyFragment('#/song/x?scroll=encore-song-practice-heading')).toBe('#/song/x');
  });

  it('reads sanitized scroll id', () => {
    expect(getEncoreHashScrollTargetId('#/song/x?scroll=encore-song-practice-heading')).toBe(
      'encore-song-practice-heading',
    );
    expect(getEncoreHashScrollTargetId('#/song/x?scroll=bad<id>')).toBeUndefined();
  });
});

describe('encoreAppHref', () => {
  it('matches navigateEncore hash targets', () => {
    expect(encoreAppHref({ kind: 'library' })).toBe('#/library');
    expect(encoreAppHref({ kind: 'savedSearches' })).toBe('#/saved-searches');
    expect(encoreAppHref({ kind: 'practice' })).toBe('#/practice');
    expect(encoreAppHref({ kind: 'practice', songId: 'x' })).toBe('#/practice/x');
    expect(encoreAppHref({ kind: 'practice', songId: 'a/b' })).toBe(`#/practice/${encodeURIComponent('a/b')}`);
    expect(encoreAppHref({ kind: 'performances' })).toBe('#/performances');
    expect(encoreAppHref({ kind: 'performances', tab: 'wrapped' })).toBe('#/performances/wrapped');
    expect(encoreAppHref({ kind: 'repertoireSettings' })).toBe('#/settings/repertoire');
    expect(encoreAppHref({ kind: 'help' })).toBe('#/help');
    expect(encoreAppHref({ kind: 'songNew' })).toBe('#/song/new');
    expect(encoreAppHref({ kind: 'song', id: 'ab/cd' })).toBe(`#/song/${encodeURIComponent('ab/cd')}`);
    expect(
      encoreAppHref({
        kind: 'song',
        id: 'x',
        scrollToElementId: 'encore-song-practice-heading',
      }),
    ).toBe('#/song/x?scroll=encore-song-practice-heading');
    expect(encoreAppHref({ kind: 'song', id: 'x', scrollToElementId: 'bad<id>' })).toBe('#/song/x');
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
