import { afterEach, describe, expect, it } from 'vitest';

import { parsePalettegenUrl, serializePalettegenUrl } from './palettegenUrlParams';

describe('palettegenUrlParams', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/palette/');
  });

  it('parses shared color rows', () => {
    window.history.replaceState({}, '', '/palette/?colors=ff44a1,fbbf24,38bdf8');
    expect(parsePalettegenUrl()).toEqual({
      colors: ['ff44a1', 'fbbf24', '38bdf8'],
      seed: undefined,
      mode: undefined,
    });
  });

  it('serializes active palette for sharing', () => {
    const url = serializePalettegenUrl({
      colors: ['#FF44A1', '#fbbf24'],
      mode: 'seed',
      seed: '#ff44a1',
    });
    expect(url).toContain('colors=ff44a1%2Cfbbf24');
    expect(url).toContain('mode=seed');
    expect(url).toContain('seed=ff44a1');
  });
});
