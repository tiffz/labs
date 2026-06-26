import { describe, expect, it, vi } from 'vitest';

import {
  buildDrumsAppUrl,
  DEFAULT_DRUMS_URL_STATE,
  drumsRhythmHref,
  parseDrumsUrlParams,
} from './drumsAppUrl';

describe('drumsAppUrl', () => {
  it('parseDrumsUrlParams reads rhythm, tempo, and time signature', () => {
    expect(
      parseDrumsUrlParams('?rhythm=D--T--T-&bpm=96&time=2/4&groups=3%2B3%2B2&metronome=true'),
    ).toEqual({
      notation: 'D--T--T-',
      bpm: 96,
      timeSignature: { numerator: 2, denominator: 4 },
      beatGrouping: [3, 3, 2],
      metronomeEnabled: true,
    });
  });

  it('buildDrumsAppUrl omits defaults and preserves unrelated params', () => {
    expect(
      buildDrumsAppUrl(DEFAULT_DRUMS_URL_STATE, {
        pathname: '/drums/',
        baseSearch: '?debug=1',
      }),
    ).toBe('/drums/?debug=1');

    expect(
      buildDrumsAppUrl(
        {
          ...DEFAULT_DRUMS_URL_STATE,
          notation: 'D--T--T-',
          timeSignature: { numerator: 2, denominator: 4 },
          bpm: 96,
          metronomeEnabled: true,
        },
        { pathname: '/drums/', baseSearch: '?debug=1' },
      ),
    ).toBe('/drums/?debug=1&rhythm=D--T--T-&bpm=96&time=2%2F4&metronome=true');
  });

  it('drumsRhythmHref merges variation onto current query state', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/drums/', search: '' },
    });
    expect(
      drumsRhythmHref('D--T--T-', { numerator: 2, denominator: 4 }, { bpm: 96 }),
    ).toBe('/drums/?rhythm=D--T--T-&bpm=96&time=2%2F4');
    vi.unstubAllGlobals();
  });
});
