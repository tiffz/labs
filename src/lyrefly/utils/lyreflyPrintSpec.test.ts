import { describe, expect, it } from 'vitest';

import { createBlankComicProject } from '../types';
import { DEFAULT_LYREFLY_PRINT_SPEC, printSpecSummary, resolveLyreflyPrintSpec } from './lyreflyPrintSpec';

describe('lyreflyPrintSpec', () => {
  it('defaults to Digest 5.5 × 8.5 staple binding', () => {
    const project = createBlankComicProject();
    const spec = resolveLyreflyPrintSpec(project);
    expect(spec.trimWidth).toBe(DEFAULT_LYREFLY_PRINT_SPEC.trimWidth);
    expect(spec.trimHeight).toBe(DEFAULT_LYREFLY_PRINT_SPEC.trimHeight);
    expect(spec.binding).toBe('staple');
  });

  it('summarizes bleed file dimensions for Mixam digest', () => {
    const summary = printSpecSummary(DEFAULT_LYREFLY_PRINT_SPEC);
    expect(summary.bleedLabel).toContain('5.75');
    expect(summary.bleedLabel).toContain('8.75');
    expect(summary.fileLabel).toContain('1725');
    expect(summary.fileLabel).toContain('2625');
    expect(summary.bleedReadout).toContain('0.125');
  });

  it('applies custom bleed inches to artwork size', () => {
    const summary = printSpecSummary({ ...DEFAULT_LYREFLY_PRINT_SPEC, bleedInches: 0.25 });
    expect(summary.bleedLabel).toContain('6');
    expect(summary.bleedLabel).toContain('9');
  });
});
