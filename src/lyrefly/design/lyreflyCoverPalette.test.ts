import { describe, expect, it } from 'vitest';

import { coverInitialFromTitle, coverPaletteForProject } from './lyreflyCoverPalette';

describe('lyreflyCoverPalette', () => {
  it('returns a stable palette per project id', () => {
    const first = coverPaletteForProject('project-a');
    const second = coverPaletteForProject('project-a');
    const other = coverPaletteForProject('project-b');
    expect(second).toEqual(first);
    expect(other.wash).not.toBe(first.wash);
  });

  it('derives a display initial from title', () => {
    expect(coverInitialFromTitle('midnight courier')).toBe('M');
    expect(coverInitialFromTitle('   ')).toBe('?');
  });
});
