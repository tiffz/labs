import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  getActiveBatchUploadSession,
  markBatchJobCompleted,
  persistUploadBatchJobs,
} from './gestureUploadBatchQueue';

describe('gestureUploadBatchQueue', () => {
  beforeEach(async () => {
    await gestureDb.delete();
    await gestureDb.open();
  });

  it('persists multi-folder batches for recovery', async () => {
    const jobs = await persistUploadBatchJobs([
      { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'Folder A' },
      { files: [new File(['b'], 'b.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'Folder B' },
    ]);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sessionId).toBeTruthy();
    expect(jobs[0]?.batchJobId).toBeTruthy();

    const session = await getActiveBatchUploadSession();
    expect(session?.totalJobs).toBe(2);
    expect(session?.pendingCount).toBe(2);
  });

  it('marks jobs complete and closes the session', async () => {
    const [first] = await persistUploadBatchJobs([
      { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'Folder A' },
      { files: [new File(['b'], 'b.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'Folder B' },
    ]);
    expect(first?.batchJobId).toBeTruthy();

    await markBatchJobCompleted(first!.batchJobId, 'pack-a');

    const mid = await getActiveBatchUploadSession();
    expect(mid?.completedJobs).toBe(1);
    expect(mid?.pendingCount).toBe(1);
  });

  it('skips persistence for a single-folder upload with no active batch', async () => {
    const jobs = await persistUploadBatchJobs([
      { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'Solo' },
    ]);
    expect(jobs).toHaveLength(1);
    const session = await getActiveBatchUploadSession();
    expect(session).toBeNull();
  });
});
