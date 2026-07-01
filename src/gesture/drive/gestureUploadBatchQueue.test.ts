import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  getActiveBatchUploadSession,
  markBatchJobCompleted,
  persistUploadBatchJobs,
  uploadDirectoryHandleKeyForBatchJob,
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

  it('persists a single folder when a directory handle is present', async () => {
    const handle = { name: 'Solo' } as FileSystemDirectoryHandle;
    const jobs = await persistUploadBatchJobs([
      {
        files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })],
        suggestedFolderName: 'Solo',
        directoryHandle: handle,
      },
    ]);
    expect(jobs[0]?.sessionId).toBeTruthy();
    const session = await getActiveBatchUploadSession();
    expect(session?.totalJobs).toBe(1);
  });

  it('resolves directory handle key from pack id after upload starts', () => {
    expect(uploadDirectoryHandleKeyForBatchJob({ id: 'job-1' })).toBe('job-1');
    expect(uploadDirectoryHandleKeyForBatchJob({ id: 'job-1', packId: 'pack-1' })).toBe('pack-1');
  });

  it('appends jobs to an active batch session', async () => {
    await persistUploadBatchJobs([
      { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'A' },
      { files: [new File(['b'], 'b.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'B' },
    ]);
    await persistUploadBatchJobs([
      { files: [new File(['c'], 'c.jpg', { type: 'image/jpeg' })], suggestedFolderName: 'C' },
    ]);
    const session = await getActiveBatchUploadSession();
    expect(session?.totalJobs).toBe(3);
    expect(session?.pendingCount).toBe(3);
  });
});
