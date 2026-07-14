import { afterEach, describe, expect, it } from 'vitest';

import {
  buildPalettegenShareUrl,
  parsePalettegenUrl,
  serializePalettegenUrl,
} from './palettegenUrlParams';

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

  it('ignores legacy mode=image so shared colors stay colors-only', () => {
    window.history.replaceState({}, '', '/palette/?colors=ff44a1,fbbf24,38bdf8&mode=image');
    expect(parsePalettegenUrl()).toEqual({
      colors: ['ff44a1', 'fbbf24', '38bdf8'],
      seed: undefined,
      mode: undefined,
    });
  });

  it('serializes active palette for sharing without mode=image', () => {
    const url = serializePalettegenUrl({
      colors: ['#FF44A1', '#fbbf24'],
      mode: 'image',
    });
    expect(url).toContain('colors=ff44a1%2Cfbbf24');
    expect(url).not.toContain('mode=');
    expect(url).not.toContain('seed=');
  });

  it('serializes seed mode with seed', () => {
    const url = serializePalettegenUrl({
      colors: ['#FF44A1', '#fbbf24'],
      mode: 'seed',
      seed: '#ff44a1',
    });
    expect(url).toContain('colors=ff44a1%2Cfbbf24');
    expect(url).toContain('mode=seed');
    expect(url).toContain('seed=ff44a1');
  });

  it('builds an absolute normalized share URL', () => {
    const url = buildPalettegenShareUrl({
      colors: ['#FF44A1', '#FBBF24', '#38bdf8'],
      mode: 'image',
    });
    expect(url).toBe(`${window.location.origin}/palette/?colors=ff44a1%2Cfbbf24%2C38bdf8`);
  });

  it('buildPalettegenShareUrl includes seed mode params', () => {
    const url = buildPalettegenShareUrl({
      colors: ['#cdb4db', '#ffc8dd'],
      mode: 'seed',
      seed: '#CDB4DB',
    });
    expect(url).toContain('/palette/?');
    expect(url).toContain('colors=cdb4db%2Cffc8dd');
    expect(url).toContain('mode=seed');
    expect(url).toContain('seed=cdb4db');
  });
});
