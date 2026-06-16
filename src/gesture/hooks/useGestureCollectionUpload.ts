import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import type { DataTransferDropSnapshot } from '../../shared/utils/readDataTransferEntryFiles';
import {
  readDataTransferDropBatches,
  snapshotHasMultipleTopLevelFolders,
} from '../../shared/utils/readDataTransferEntryFiles';
import { addPhotosToExistingPack } from '../drive/addPhotosToExistingPack';
import { createPackFromUpload } from '../drive/createPackFromUpload';
import { gestureDb } from '../db/gestureDb';
import {
  collectLocalFolderUploadImages,
  inferLocalFolderName,
  isLocalFolderUpload,
  resolveUploadCollectionName,
  splitFilesByTopLevelFolder,
  hasMultipleTopLevelFolders,
  type GestureUploadFileBatch,
} from '../drive/gestureLocalFolderUpload';
import { filterGestureUploadImageFiles } from '../drive/gesturePackMetadata';
import { resumePackUpload } from '../drive/resumePackUpload';
import { findResumablePackForUploadJob, loadFilesForUploadResume } from '../drive/gestureUploadResume';
import { isTransientUploadError } from '../drive/gestureUploadNetwork';
import { buildUploadActivity } from '../drive/gestureUploadActivity';
import { isGestureUploadCancelledError } from '../drive/gestureUploadCancellation';
import { formatUploadDuplicateSkipMessage } from '../drive/gestureUploadDuplicateFilter';
import type { GestureUploadActivity, GestureUploadPhase } from '../types';

type UseGestureCollectionUploadOptions = {
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

type NewCollectionJob = {
  files: File[];
  suggestedFolderName?: string;
  directoryHandle?: FileSystemDirectoryHandle;
};

type UploadSessionProgress = {
  totalFiles: number;
  completedFiles: number;
  totalCollections: number;
  completedCollections: number;
};

function sessionFileCount(jobs: NewCollectionJob[]): number {
  return jobs.reduce((sum, job) => sum + job.files.length, 0);
}

function batchesFromPickedFiles(picked: File[], suggestedFolderName?: string): GestureUploadFileBatch[] {
  if (hasMultipleTopLevelFolders(picked)) {
    return splitFilesByTopLevelFolder(picked);
  }
  return [{ files: picked, suggestedFolderName }];
}

function newCollectionJobsFromBatches(batches: GestureUploadFileBatch[]): NewCollectionJob[] {
  const jobs: NewCollectionJob[] = [];
  for (const batch of batches) {
    const fromFolder = Boolean(batch.suggestedFolderName) || isLocalFolderUpload(batch.files);
    const images = fromFolder
      ? collectLocalFolderUploadImages(batch.files)
      : filterGestureUploadImageFiles(batch.files);
    if (images.length === 0) continue;
    jobs.push({
      files: images,
      suggestedFolderName: resolveUploadCollectionName(batch.files, batch.suggestedFolderName),
      directoryHandle: batch.directoryHandle,
    });
  }
  return jobs;
}

export function useGestureCollectionUpload({ onComplete, onError }: UseGestureCollectionUploadOptions) {
  const [busy, setBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [activity, setActivity] = useState<GestureUploadActivity | null>(null);
  const queueRef = useRef<NewCollectionJob[]>([]);
  const drainingRef = useRef(false);
  const sessionRef = useRef<UploadSessionProgress | null>(null);
  const tokenRef = useRef<string | null>(null);
  const needsInteractiveAuthRef = useRef(true);
  const cancelledPackIdsRef = useRef(new Set<string>());

  const isUploadCancelled = useCallback((packId: string) => cancelledPackIdsRef.current.has(packId), []);

  const cancelUploadForPack = useCallback((packId: string) => {
    cancelledPackIdsRef.current.add(packId);
  }, []);

  const extendUploadSession = useCallback((jobs: NewCollectionJob[]) => {
    if (jobs.length === 0) return;
    const fileCount = sessionFileCount(jobs);
    const existing = sessionRef.current;
    if (!existing) {
      sessionRef.current = {
        totalFiles: fileCount,
        completedFiles: 0,
        totalCollections: jobs.length,
        completedCollections: 0,
      };
      return;
    }
    existing.totalFiles += fileCount;
    existing.totalCollections += jobs.length;
  }, []);

  const completeUploadSessionJob = useCallback((job: NewCollectionJob) => {
    const session = sessionRef.current;
    if (!session) return;
    session.completedFiles += job.files.length;
    session.completedCollections += 1;
  }, []);

  const buildSessionActivity = useCallback(
    (
      phase: GestureUploadPhase,
      params?: {
        done?: number;
        total?: number;
        collectionName?: string;
        scannedCount?: number;
      },
    ): GestureUploadActivity => {
      const queuedCount = queueRef.current.length;
      const session = sessionRef.current;
      const multiCollection = session != null && session.totalCollections > 1;

      if (multiCollection && session) {
        const jobDone = params?.done ?? 0;
        const aggregateDone = session.completedFiles + jobDone;
        const aggregateTotal = session.totalFiles;
        const collectionsRemaining = queuedCount;

        return buildUploadActivity(phase, {
          ...params,
          done: aggregateDone,
          total: aggregateTotal,
          queuedCount,
          multiCollection: true,
          collectionsRemaining,
        });
      }

      return buildUploadActivity(phase, { ...params, queuedCount });
    },
    [],
  );

  const setUploadActivity = useCallback(
    (next: GestureUploadActivity | null) => {
      setActivity(next);
    },
    [],
  );

  const resolveUploadToken = useCallback(async (): Promise<string> => {
    if (!needsInteractiveAuthRef.current && tokenRef.current) {
      try {
        return await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
      } catch {
        /* refresh interactively below */
      }
    }
    const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
    tokenRef.current = token;
    needsInteractiveAuthRef.current = false;
    return token;
  }, []);

  const executeNewCollectionJob = useCallback(
    async (job: NewCollectionJob): Promise<string | null> => {
      const fromFolder = Boolean(job.suggestedFolderName) || isLocalFolderUpload(job.files);
      const images = job.files;
      const collectionName = job.suggestedFolderName;

      const uploadHandlers = {
        onProgress: (done: number, total: number) => {
          setUploadActivity(buildSessionActivity('uploading', { done, total, collectionName }));
        },
        onNetworkWait: (done: number, total: number) => {
          setUploadActivity(buildSessionActivity('waiting', { done, total, collectionName }));
        },
        isCancelled: isUploadCancelled,
      };

      setUploadActivity(buildSessionActivity('checking', { total: images.length, collectionName }));
      onError('');

      const token = await resolveUploadToken();
      const resumablePack = await findResumablePackForUploadJob(job);

      if (resumablePack) {
        setUploadActivity(buildSessionActivity('preparing', { total: images.length, collectionName }));
        const result = await resumePackUpload(
          token,
          resumablePack.id,
          images,
          uploadHandlers.onProgress,
          uploadHandlers,
        );
        const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
        if (result.newlyUploaded === 0 && result.skippedDuplicates === 0 && result.skipped > 0) {
          return `Upload complete for "${result.pack.name}".${dupeSuffix}`;
        }
        setUploadActivity(
          buildSessionActivity('finishing', {
            done: result.newlyUploaded,
            total: result.newlyUploaded,
            collectionName,
          }),
        );
        completeUploadSessionJob(job);
        return result.newlyUploaded > 0
          ? `Uploaded ${result.newlyUploaded} more photo${result.newlyUploaded === 1 ? '' : 's'} to "${result.pack.name}".${dupeSuffix}`
          : `Upload complete for "${result.pack.name}".${dupeSuffix}`;
      }

      setUploadActivity(buildSessionActivity('preparing', { total: images.length, collectionName }));
      const result = await createPackFromUpload(
        token,
        { files: images, name: collectionName },
        uploadHandlers.onProgress,
        (hashed, total) => {
          setUploadActivity(buildSessionActivity('checking', { done: hashed, total, collectionName }));
        },
        { ...uploadHandlers, directoryHandle: job.directoryHandle },
      );
      const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
      if (result.imageCount === 0 && result.skippedDuplicates > 0) {
        return `All ${result.skippedDuplicates} photos were duplicates. Nothing new to upload.`;
      }
      setUploadActivity(
        buildSessionActivity('finishing', {
          done: result.imageCount,
          total: result.imageCount,
          collectionName,
        }),
      );
      completeUploadSessionJob(job);
      return fromFolder
        ? `Added ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'} to "${result.pack.name}".${dupeSuffix}`
        : `Added ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'}. Tap the collection to name it.${dupeSuffix}`;
    },
    [completeUploadSessionJob, isUploadCancelled, onError, resolveUploadToken, buildSessionActivity, setUploadActivity],
  );

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setBusy(true);

    const summaries: string[] = [];
    let hadError = false;

    while (queueRef.current.length > 0) {
      const job = queueRef.current.shift()!;
      setQueuedCount(queueRef.current.length);
      try {
        const message = await executeNewCollectionJob(job);
        if (message) summaries.push(message);
      } catch (e) {
        if (isGestureUploadCancelledError(e)) {
          continue;
        }
        hadError = true;
        const transient = isTransientUploadError(e);
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onError(e.message);
          queueRef.current = [];
          sessionRef.current = null;
          break;
        }
        if (transient) {
          queueRef.current.unshift(job);
          onError(
            'Connection lost. Upload paused. It will resume automatically when you are back online.',
          );
          break;
        }
        onError(
          e instanceof Error
            ? `${e.message} Check Collections to continue or clean up this upload.`
            : 'Upload failed. Check Collections to continue or clean up.',
        );
        break;
      }
    }

    setQueuedCount(0);
    drainingRef.current = false;
    const queueEmpty = queueRef.current.length === 0;
    if (queueEmpty) {
      setBusy(false);
      setActivity(null);
      sessionRef.current = null;
      cancelledPackIdsRef.current.clear();
    } else {
      setQueuedCount(queueRef.current.length);
    }

    if (summaries.length === 1) {
      onComplete(summaries[0]!);
    } else if (summaries.length > 1) {
      onComplete(`Uploaded ${summaries.length} collections.`);
    } else if (!hadError && summaries.length === 0 && queueRef.current.length === 0) {
      /* empty queue after invalid jobs — caller should have surfaced error */
    }
  }, [executeNewCollectionJob, onComplete, onError]);

  useEffect(() => {
    const resumeQueuedUploads = () => {
      if (queueRef.current.length === 0 || drainingRef.current) return;
      setBusy(true);
      void drainQueue();
    };
    window.addEventListener('online', resumeQueuedUploads);
    return () => window.removeEventListener('online', resumeQueuedUploads);
  }, [drainQueue]);

  const enqueueNewCollectionJobs = useCallback(
    (jobs: NewCollectionJob[]) => {
      if (jobs.length === 0) {
        onError('Use JPEG, PNG, WebP, GIF, or similar images.');
        return;
      }
      extendUploadSession(jobs);
      queueRef.current.push(...jobs);
      setQueuedCount(queueRef.current.length);
      void drainQueue();
    },
    [drainQueue, extendUploadSession, onError],
  );

  const continueUploadForPack = useCallback(
    async (packId: string, picked: File[]) => {
      const collectionName = resolveUploadCollectionName(picked, inferLocalFolderName(picked));
      setBusy(true);
      setUploadActivity(buildUploadActivity('scanning', { scannedCount: picked.length, collectionName }));
      onError('');

      try {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        setUploadActivity(buildUploadActivity('preparing', { collectionName }));
        const uploadHandlers = {
          onProgress: (done: number, total: number) => {
            setUploadActivity(buildUploadActivity('uploading', { done, total, collectionName }));
          },
          onNetworkWait: (done: number, total: number) => {
            setUploadActivity(buildUploadActivity('waiting', { done, total, collectionName }));
          },
          isCancelled: isUploadCancelled,
        };
        const result = await resumePackUpload(
          token,
          packId,
          picked,
          uploadHandlers.onProgress,
          uploadHandlers,
        );
        const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
        onComplete(
          result.newlyUploaded > 0
            ? `Uploaded ${result.newlyUploaded} more photo${result.newlyUploaded === 1 ? '' : 's'} to "${result.pack.name}" (${result.skipped} already on Drive).${dupeSuffix}`
            : `Upload complete for "${result.pack.name}".${dupeSuffix}`,
        );
      } catch (e) {
        if (isGestureUploadCancelledError(e)) {
          return;
        }
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onError(e.message);
        } else {
          onError(e instanceof Error ? e.message : 'Could not continue upload.');
        }
      } finally {
        setBusy(false);
        setActivity(null);
      }
    },
    [isUploadCancelled, onComplete, onError, setUploadActivity],
  );

  const continueUploadForPackPersisted = useCallback(
    async (packId: string) => {
      const files = await loadFilesForUploadResume(packId);
      if (!files || files.length === 0) {
        onError('Choose the same folder to continue this upload.');
        return;
      }
      await continueUploadForPack(packId, files);
    },
    [continueUploadForPack, onError],
  );

  const uploadPhotosToPack = useCallback(
    async (packId: string, snapshot: DataTransferDropSnapshot) => {
      setBusy(true);
      setUploadActivity(buildUploadActivity('scanning'));
      onError('');

      try {
        const dropBatches = await readDataTransferDropBatches(snapshot, {
          onFileFound: (count) => {
            setUploadActivity(buildUploadActivity('scanning', { scannedCount: count }));
          },
        });
        if (dropBatches.length === 0 || dropBatches.every((b) => b.files.length === 0)) {
          onError('Drop a folder or image files to upload.');
          return;
        }
        if (dropBatches.length > 1) {
          onError('Drop one folder or photo set at a time when adding to a collection.');
          return;
        }
        const drop = dropBatches[0]!;

        const fromFolder = Boolean(drop.suggestedFolderName) || isLocalFolderUpload(drop.files);
        const images = fromFolder
          ? collectLocalFolderUploadImages(drop.files)
          : filterGestureUploadImageFiles(drop.files);
        if (images.length === 0) {
          onError('Use JPEG, PNG, WebP, GIF, or similar images.');
          return;
        }

        setUploadActivity(buildUploadActivity('checking', { total: images.length }));
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const pack = await gestureDb.packs.get(packId);
        const collectionName = pack?.name ?? 'collection';
        const uploadHandlers = {
          onProgress: (done: number, total: number) => {
            setUploadActivity(buildUploadActivity('uploading', { done, total, collectionName }));
          },
          onNetworkWait: (done: number, total: number) => {
            setUploadActivity(buildUploadActivity('waiting', { done, total, collectionName }));
          },
          isCancelled: isUploadCancelled,
        };
        const result = await addPhotosToExistingPack(
          token,
          packId,
          drop.files,
          uploadHandlers.onProgress,
          (hashed, total) => {
            setUploadActivity(buildUploadActivity('checking', { done: hashed, total, collectionName }));
          },
          uploadHandlers,
        );
        const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
        if (result.uploadedCount === 0) {
          onComplete(
            result.skippedDuplicates > 0
              ? `All ${result.skippedDuplicates} dropped photos are already in "${result.pack.name}".`
              : `No new photos to add to "${result.pack.name}".`,
          );
          return;
        }
        setUploadActivity(
          buildUploadActivity('finishing', {
            done: result.uploadedCount,
            total: result.uploadedCount,
            collectionName: result.pack.name,
          }),
        );
        onComplete(
          `Added ${result.uploadedCount} photo${result.uploadedCount === 1 ? '' : 's'} to "${result.pack.name}".${dupeSuffix}`,
        );
      } catch (e) {
        if (isGestureUploadCancelledError(e)) {
          return;
        }
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onError(e.message);
        } else {
          onError(e instanceof Error ? e.message : 'Could not add photos to this collection.');
        }
      } finally {
        setBusy(false);
        setActivity(null);
      }
    },
    [isUploadCancelled, onComplete, onError, setUploadActivity],
  );

  const uploadFromSnapshot = useCallback(
    async (snapshot: DataTransferDropSnapshot) => {
      setBusy(true);
      setUploadActivity(buildSessionActivity('scanning'));
      onError('');

      try {
        const dropBatches = await readDataTransferDropBatches(snapshot, {
          onFileFound: (count) => {
            setUploadActivity(buildSessionActivity('scanning', { scannedCount: count }));
          },
        });
        if (dropBatches.length === 0) {
          onError('Drop a folder or image files to upload.');
          setBusy(false);
          setActivity(null);
          return;
        }

        const jobs = newCollectionJobsFromBatches(
          dropBatches.flatMap((batch) =>
            hasMultipleTopLevelFolders(batch.files)
              ? splitFilesByTopLevelFolder(batch.files)
              : [batch],
          ),
        );
        if (jobs.length === 0) {
          onError('Use JPEG, PNG, WebP, GIF, or similar images.');
          setBusy(false);
          setActivity(null);
          return;
        }

        const directoryEntries = snapshot.entries.filter((entry) => entry.isDirectory);
        if (
          jobs.length === 1 &&
          snapshot.fileItemCount > 1 &&
          directoryEntries.length <= 1 &&
          !snapshotHasMultipleTopLevelFolders(snapshot)
        ) {
          onError(
            'Only one folder was read from this drop. Use Add → Upload folders… to batch several folders at once.',
          );
          setBusy(false);
          setActivity(null);
          return;
        }

        setBusy(false);
        setActivity(null);
        enqueueNewCollectionJobs(jobs);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not read dropped folder.');
        setBusy(false);
        setActivity(null);
      }
    },
    [buildSessionActivity, enqueueNewCollectionJobs, onError, setUploadActivity],
  );

  const uploadFiles = useCallback(
    async (picked: File[], suggestedFolderName?: string) => {
      if (picked.length === 0) return;
      const batches = batchesFromPickedFiles(picked, suggestedFolderName);
      const jobs = newCollectionJobsFromBatches(batches);
      if (jobs.length === 0) {
        onError('Use JPEG, PNG, WebP, GIF, or similar images.');
        return;
      }
      if (drainingRef.current || queueRef.current.length > 0) {
        enqueueNewCollectionJobs(jobs);
        return;
      }
      setUploadActivity(buildSessionActivity('scanning', { scannedCount: picked.length }));
      enqueueNewCollectionJobs(jobs);
    },
    [buildSessionActivity, enqueueNewCollectionJobs, onError, setUploadActivity],
  );

  const uploadFolderBatches = useCallback(
    (batches: GestureUploadFileBatch[]) => {
      const jobs = newCollectionJobsFromBatches(batches);
      if (jobs.length === 0) {
        onError('Use JPEG, PNG, WebP, GIF, or similar images.');
        return;
      }
      const fileCount = batches.reduce((sum, batch) => sum + batch.files.length, 0);
      setUploadActivity(buildSessionActivity('scanning', { scannedCount: fileCount }));
      enqueueNewCollectionJobs(jobs);
    },
    [buildSessionActivity, enqueueNewCollectionJobs, onError, setUploadActivity],
  );

  return {
    busy,
    queuedCount,
    activity,
    uploadFiles,
    uploadFolderBatches,
    uploadFromSnapshot,
    uploadPhotosToPack,
    continueUploadForPack,
    continueUploadForPackPersisted,
    cancelUploadForPack,
  };
}

export type GestureCollectionUploadHandle = ReturnType<typeof useGestureCollectionUpload>;
