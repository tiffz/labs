import { describe, expect, it } from 'vitest';
import { isGesturePackUploadComplete } from './reconcileStaleGestureUploadPacks';
import type { GesturePack } from '../types';

const basePack: GesturePack = {
  id: 'p1',
  driveFolderId: 'f1',
  name: 'Cats',
  linkedAt: '2026-01-01T00:00:00.000Z',
  lastIndexedAt: '2026-01-01T00:00:00.000Z',
  source: 'upload',
};

describe('isGesturePackUploadComplete', () => {
  it('clears when indexed count reaches expected total without manifest', () => {
    expect(
      isGesturePackUploadComplete(
        { ...basePack, uploadStatus: 'uploading', expectedFileCount: 400, uploadedFileCount: 58 },
        400,
        0,
        0,
      ),
    ).toBe(true);
  });

  it('stays incomplete when indexed count is below expected', () => {
    expect(
      isGesturePackUploadComplete(
        { ...basePack, uploadStatus: 'uploading', expectedFileCount: 400, uploadedFileCount: 58 },
        58,
        0,
        0,
      ),
    ).toBe(false);
  });

  it('clears when manifest has no pending rows', () => {
    expect(
      isGesturePackUploadComplete(
        { ...basePack, uploadStatus: 'incomplete', expectedFileCount: 10 },
        8,
        0,
        10,
      ),
    ).toBe(true);
  });
});
