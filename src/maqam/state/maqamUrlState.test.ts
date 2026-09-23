import { describe, expect, it } from 'vitest';

import {
  decodeTuning,
  encodeTuning,
  readMaqamUrlState,
  writeMaqamUrlSearch,
} from './maqamUrlState';
import { MAQAM_PRESETS_BY_ID, deriveDetuneMatrix } from '../data/maqamPresets';
import { toggleDetuneSlot } from './maqamTuning';

const rastMatrix = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.rast_c.scaleDegrees).matrix;
const hijazMatrix = deriveDetuneMatrix(MAQAM_PRESETS_BY_ID.hijaz_d.scaleDegrees).matrix;

describe('tuning encoding', () => {
  it('round-trips every preset tuning', () => {
    for (const preset of Object.values(MAQAM_PRESETS_BY_ID)) {
      const matrix = deriveDetuneMatrix(preset.scaleDegrees).matrix;
      expect(decodeTuning(encodeTuning(matrix)), preset.id).toEqual(matrix);
    }
  });

  it('encodes Rast’s half-flat third and seventh', () => {
    expect(encodeTuning(rastMatrix)).toBe('----d------d');
  });

  it('encodes an all-equal tuning as twelve dashes', () => {
    expect(encodeTuning(hijazMatrix)).toBe('------------');
  });

  /**
   * A corrupt tuning must not decode to "everything equal-tempered" — that is a
   * plausible-looking state the user never chose, and it would silently strip
   * the microtones the link was shared to demonstrate.
   */
  it.each([
    ['too short', '----d'],
    ['too long', '----d------d-'],
    ['unknown character', '----x------d'],
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s rather than decoding it to equal temperament', (_label, input) => {
    expect(decodeTuning(input)).toBeNull();
  });
});

describe('readMaqamUrlState', () => {
  it('defaults to Rast with its own tuning', () => {
    const state = readMaqamUrlState('');
    expect(state.presetId).toBe('rast_c');
    expect(state.matrix).toEqual(rastMatrix);
  });

  it('reads a named maqam', () => {
    expect(readMaqamUrlState('?maqam=hijaz_d').presetId).toBe('hijaz_d');
  });

  it('falls back to the default for an unknown maqam', () => {
    const state = readMaqamUrlState('?maqam=not_a_maqam');
    expect(state.presetId).toBe('rast_c');
    expect(state.matrix).toEqual(rastMatrix);
  });

  it('applies a custom tuning over the preset’s', () => {
    const custom = toggleDetuneSlot(rastMatrix, 9);
    const state = readMaqamUrlState(`?maqam=rast_c&tuning=${encodeTuning(custom)}`);
    expect(state.matrix).toEqual(custom);
  });

  it('falls back to the maqam’s tuning when the custom one is corrupt', () => {
    const state = readMaqamUrlState('?maqam=rast_c&tuning=garbage');
    expect(state.matrix).toEqual(rastMatrix);
  });
});

describe('writeMaqamUrlSearch', () => {
  it('writes only the maqam when the tuning is untouched', () => {
    expect(writeMaqamUrlSearch({ presetId: 'rast_c', matrix: rastMatrix })).toBe(
      '?maqam=rast_c',
    );
  });

  it('adds the tuning once it diverges from the preset', () => {
    const custom = toggleDetuneSlot(rastMatrix, 9);
    const search = writeMaqamUrlSearch({ presetId: 'rast_c', matrix: custom });
    expect(search).toContain('maqam=rast_c');
    expect(search).toContain(`tuning=${encodeTuning(custom)}`);
  });

  it('drops a stale tuning param when the tuning returns to the preset', () => {
    const search = writeMaqamUrlSearch(
      { presetId: 'rast_c', matrix: rastMatrix },
      '?maqam=rast_c&tuning=----d------d',
    );
    expect(search).toBe('?maqam=rast_c');
  });

  it('preserves unrelated query params', () => {
    const search = writeMaqamUrlSearch(
      { presetId: 'rast_c', matrix: rastMatrix },
      '?debug=1',
    );
    expect(search).toContain('debug=1');
    expect(search).toContain('maqam=rast_c');
  });

  it('round-trips through readMaqamUrlState', () => {
    const custom = toggleDetuneSlot(hijazMatrix, 4);
    const search = writeMaqamUrlSearch({ presetId: 'hijaz_d', matrix: custom });
    const state = readMaqamUrlState(search);
    expect(state.presetId).toBe('hijaz_d');
    expect(state.matrix).toEqual(custom);
  });
});
