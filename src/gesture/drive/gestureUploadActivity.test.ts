import { describe, expect, it } from 'vitest';
import {
  buildUploadActivity,
  formatInterruptedUploadHeadline,
  formatInterruptedUploadSummary,
  isIncompleteUploadPack,
  shouldShowUploadRecoveryBanner,
} from './gestureUploadActivity';
import type { GesturePack } from '../types';

const basePack: GesturePack = {
  id: 'p1',
  driveFolderId: 'f1',
  name: 'Life drawing',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
  source: 'upload',
};

describe('gestureUploadActivity', () => {
  it('detects incomplete upload packs', () => {
    expect(isIncompleteUploadPack({ ...basePack, uploadStatus: 'uploading' })).toBe(true);
    expect(isIncompleteUploadPack({ ...basePack, uploadStatus: 'incomplete' })).toBe(true);
    expect(isIncompleteUploadPack(basePack)).toBe(false);
  });

  it('shows recovery banner only when upload is not active in session', () => {
    const incomplete = { ...basePack, uploadStatus: 'incomplete' as const };
    const uploading = { ...basePack, uploadStatus: 'uploading' as const };
    expect(shouldShowUploadRecoveryBanner(incomplete, false)).toBe(true);
    expect(shouldShowUploadRecoveryBanner(incomplete, true)).toBe(true);
    expect(shouldShowUploadRecoveryBanner(uploading, false)).toBe(true);
    expect(shouldShowUploadRecoveryBanner(uploading, true)).toBe(false);
    expect(shouldShowUploadRecoveryBanner(basePack, false)).toBe(false);
  });

  it('formats interrupted upload summaries', () => {
    expect(
      formatInterruptedUploadSummary(
        { ...basePack, uploadStatus: 'incomplete', expectedFileCount: 120, uploadedFileCount: 47 },
        47,
      ),
    ).toContain('47 of 120');
  });

  it('formats interrupted upload headline', () => {
    expect(formatInterruptedUploadHeadline(basePack)).toBe('Upload interrupted — "Life drawing"');
  });

  it('builds phase labels', () => {
    expect(buildUploadActivity('scanning').label).toBe('Reading dropped folder…');
    expect(buildUploadActivity('scanning', { scannedCount: 12 }).label).toContain('12 files');
    expect(buildUploadActivity('uploading', { done: 2, total: 5 }).label).toContain('2 of 5');
  });
});
