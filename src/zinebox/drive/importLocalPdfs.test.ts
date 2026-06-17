import { describe, expect, it } from 'vitest';

import { titleFromPdfFilename } from './importLocalPdfs';

describe('titleFromPdfFilename', () => {
  it('strips extension and normalizes separators', () => {
    expect(titleFromPdfFilename('issue-03-night-market.pdf')).toBe('issue 03 night market');
  });
});
