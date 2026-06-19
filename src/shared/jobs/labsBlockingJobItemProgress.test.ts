import { describe, expect, it, vi } from 'vitest';

import {
  formatBlockingJobItemProgressCaption,
  reportBlockingJobItemProgress,
} from './labsBlockingJobItemProgress';

describe('reportBlockingJobItemProgress', () => {
  it('updates label and fraction for item counts', () => {
    const updateLabel = vi.fn();
    const updateProgress = vi.fn();
    reportBlockingJobItemProgress({ updateLabel, updateProgress }, { current: 3, total: 10, detail: 'zine.pdf' });
    expect(updateLabel).toHaveBeenCalledWith('Importing 3 of 10… zine.pdf');
    expect(updateProgress).toHaveBeenCalledWith(0.3);
  });
});

describe('formatBlockingJobItemProgressCaption', () => {
  it('formats remaining count from label', () => {
    expect(formatBlockingJobItemProgressCaption('Importing 12 of 50…')).toBe(
      '12 of 50 complete · 38 remaining',
    );
  });

  it('returns null when label has no counts', () => {
    expect(formatBlockingJobItemProgressCaption('Importing PDF…')).toBeNull();
  });
});
