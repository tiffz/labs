import { gestureDb } from '../db/gestureDb';
import type { GestureUploadBatchJob, GestureUploadBatchSession } from '../types';
import {
  migrateUploadDirectoryHandle,
  readFilesFromPersistedDirectoryHandle,
  saveUploadDirectoryHandle,
} from './gestureUploadDirectoryHandle';

export type PersistedBatchJob = {
  batchJobId: string;
  sessionId: string;
  files: File[];
  suggestedFolderName: string;
  directoryHandle?: FileSystemDirectoryHandle;
};

type NewCollectionJobInput = {
  files: File[];
  suggestedFolderName?: string;
  directoryHandle?: FileSystemDirectoryHandle;
  batchJobId?: string;
};

export type ActiveBatchUploadSession = GestureUploadBatchSession & {
  pendingJobs: GestureUploadBatchJob[];
  pendingCount: number;
};

async function getActiveSession(): Promise<GestureUploadBatchSession | undefined> {
  return gestureDb.uploadBatchSessions.where('status').equals('active').first();
}

/** Persist a multi-folder upload before draining so jobs survive tab close. */
export async function persistUploadBatchJobs(
  jobs: NewCollectionJobInput[],
): Promise<Array<NewCollectionJobInput & { batchJobId: string; sessionId: string }>> {
  if (jobs.length <= 1 && !(await getActiveSession())) {
    return jobs.map((job) => ({
      ...job,
      batchJobId: job.batchJobId ?? crypto.randomUUID(),
      sessionId: '',
    }));
  }

  let session = await getActiveSession();
  if (!session) {
    session = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'active',
      totalJobs: 0,
      completedJobs: 0,
    };
    await gestureDb.uploadBatchSessions.put(session);
  }

  const existingJobs = await gestureDb.uploadBatchJobs
    .where('sessionId')
    .equals(session.id)
    .sortBy('sortIndex');
  const nextIndex = existingJobs.length;
  const enriched: Array<NewCollectionJobInput & { batchJobId: string; sessionId: string }> = [];

  await gestureDb.transaction(
    'rw',
    gestureDb.uploadBatchSessions,
    gestureDb.uploadBatchJobs,
    gestureDb.uploadDirectoryHandles,
    async () => {
      for (let i = 0; i < jobs.length; i += 1) {
        const job = jobs[i]!;
        const batchJobId = job.batchJobId ?? crypto.randomUUID();
        const suggestedFolderName = job.suggestedFolderName?.trim() || 'Folder';

        if (!job.batchJobId) {
          await gestureDb.uploadBatchJobs.put({
            id: batchJobId,
            sessionId: session!.id,
            sortIndex: nextIndex + i,
            suggestedFolderName,
            fileCount: job.files.length,
            status: 'pending',
          });
        }

        if (job.directoryHandle) {
          await saveUploadDirectoryHandle(batchJobId, job.directoryHandle);
        }

        enriched.push({
          ...job,
          batchJobId,
          sessionId: session!.id,
        });
      }

      const totalJobs = await gestureDb.uploadBatchJobs.where('sessionId').equals(session!.id).count();
      await gestureDb.uploadBatchSessions.update(session!.id, { totalJobs });
    },
  );

  return enriched;
}

export async function getActiveBatchUploadSession(): Promise<ActiveBatchUploadSession | null> {
  const session = await getActiveSession();
  if (!session) return null;

  const jobs = await gestureDb.uploadBatchJobs
    .where('sessionId')
    .equals(session.id)
    .sortBy('sortIndex');
  const pendingJobs = jobs.filter((job) => job.status === 'pending' || job.status === 'in_progress');
  if (pendingJobs.length === 0 && session.completedJobs >= session.totalJobs) {
    await gestureDb.uploadBatchSessions.update(session.id, { status: 'completed' });
    return null;
  }

  return {
    ...session,
    pendingJobs,
    pendingCount: pendingJobs.length,
  };
}

export async function loadRestorableBatchJobs(
  sessionId: string,
): Promise<PersistedBatchJob[]> {
  const jobs = await gestureDb.uploadBatchJobs
    .where('sessionId')
    .equals(sessionId)
    .sortBy('sortIndex');
  const restorable: PersistedBatchJob[] = [];

  for (const job of jobs) {
    if (job.status !== 'pending' && job.status !== 'in_progress') continue;
    const files = await readFilesFromPersistedDirectoryHandle(job.id);
    if (!files || files.length === 0) continue;
    restorable.push({
      batchJobId: job.id,
      sessionId: job.sessionId,
      files,
      suggestedFolderName: job.suggestedFolderName,
    });
  }

  return restorable;
}

export async function markBatchJobStarted(
  batchJobId: string,
  packId?: string,
): Promise<void> {
  const job = await gestureDb.uploadBatchJobs.get(batchJobId);
  if (!job) return;

  if (packId) {
    await migrateUploadDirectoryHandle(batchJobId, packId);
    await gestureDb.uploadBatchJobs.update(batchJobId, { status: 'in_progress', packId });
    return;
  }

  await gestureDb.uploadBatchJobs.update(batchJobId, { status: 'in_progress' });
}

export async function markBatchJobCompleted(batchJobId: string, packId?: string): Promise<void> {
  const job = await gestureDb.uploadBatchJobs.get(batchJobId);
  if (!job) return;

  await gestureDb.uploadBatchJobs.update(batchJobId, {
    status: 'done',
    ...(packId ? { packId } : {}),
  });

  const session = await gestureDb.uploadBatchSessions.get(job.sessionId);
  if (!session) return;

  const completedJobs = await gestureDb.uploadBatchJobs
    .where('sessionId')
    .equals(job.sessionId)
    .filter((row) => row.status === 'done')
    .count();
  const updates: Partial<GestureUploadBatchSession> = { completedJobs };
  const pendingLeft = await gestureDb.uploadBatchJobs
    .where('sessionId')
    .equals(job.sessionId)
    .filter((row) => row.status === 'pending' || row.status === 'in_progress')
    .count();
  if (pendingLeft === 0) {
    updates.status = 'completed';
  }
  await gestureDb.uploadBatchSessions.update(job.sessionId, updates);
}

export async function markBatchJobFailed(batchJobId: string): Promise<void> {
  await gestureDb.uploadBatchJobs.update(batchJobId, { status: 'failed' });
}

export async function dismissBatchUploadSession(sessionId: string): Promise<void> {
  await gestureDb.uploadBatchSessions.update(sessionId, { status: 'dismissed' });
}

export function formatBatchUploadRecoveryHeadline(session: ActiveBatchUploadSession): string {
  const done = session.completedJobs;
  const total = session.totalJobs;
  if (done > 0) {
    return `Upload batch paused — ${done} of ${total} collections finished`;
  }
  return `Upload batch paused — ${total} collections waiting`;
}

export function formatBatchUploadRecoverySummary(session: ActiveBatchUploadSession): string {
  const restorable = session.pendingJobs.filter((job) => job.status === 'pending').length;
  const inProgress = session.pendingJobs.filter((job) => job.status === 'in_progress').length;
  const parts: string[] = [];
  if (restorable > 0) {
    parts.push(
      `${restorable} folder${restorable === 1 ? '' : 's'} can continue from saved folder access in this browser`,
    );
  }
  if (inProgress > 0) {
    parts.push(
      `${inProgress} collection${inProgress === 1 ? '' : 's'} may need Continue upload on its card below`,
    );
  }
  if (parts.length === 0) {
    return 'Re-add any remaining folders with Add → Upload folders…';
  }
  return parts.join('. ');
}
