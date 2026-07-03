/**
 * ADR 0020 characterization: non-overlapping edits never block sync;
 * only needsReview blocks.
 */
import { describe, expect, it } from 'vitest';
import {
  analyzePortfolioRows,
  shouldBlockSyncForConflict,
} from './labsPortfolioConflictAnalysis';

describe('silent union (ADR 0020)', () => {
  it('does not block when local and remote edit different entities', () => {
    const analysis = analyzePortfolioRows({
      lastSyncedLocalMax: 1000,
      lastRemoteSeen: 1000,
      localRows: [{ id: 'song-a', updatedAt: 2000, label: 'A', kind: 'song' }],
      remoteRows: [{ id: 'song-b', updatedAt: 2000, label: 'B', kind: 'song' }],
      isAutoResolvable: () => true,
    });
    expect(analysis.localOnly).toHaveLength(1);
    expect(analysis.remoteOnly).toHaveLength(1);
    expect(analysis.needsReview).toHaveLength(0);
    expect(shouldBlockSyncForConflict(analysis)).toBe(false);
  });

  it('blocks only when bothEdited and dry-run says content would be lost', () => {
    const analysis = analyzePortfolioRows({
      lastSyncedLocalMax: 1000,
      lastRemoteSeen: 1000,
      localRows: [{ id: 'song-a', updatedAt: 2000, label: 'A', kind: 'song' }],
      remoteRows: [{ id: 'song-a', updatedAt: 3000, label: 'A', kind: 'song' }],
      isAutoResolvable: () => false,
    });
    expect(analysis.needsReview).toHaveLength(1);
    expect(shouldBlockSyncForConflict(analysis)).toBe(true);
  });
});
