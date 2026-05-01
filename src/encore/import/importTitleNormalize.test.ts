import { describe, expect, it } from 'vitest';
import { normalizeTitleForImportMatch } from './importTitleNormalize';

describe('normalizeTitleForImportMatch', () => {
  it('strips trailing [Live]', () => {
    expect(normalizeTitleForImportMatch('On My Own (From "Les misérables") [Live]')).toBe(
      'On My Own (From "Les misérables")',
    );
  });

  it('strips multiple bracket suffixes', () => {
    expect(normalizeTitleForImportMatch('Track A [Radio] [Clean]')).toBe('Track A');
  });

  it('leaves simple titles intact', () => {
    expect(normalizeTitleForImportMatch('Blue')).toBe('Blue');
  });
});
