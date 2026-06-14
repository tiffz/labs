import { useCallback, useState } from 'react';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import type { DataTransferDropSnapshot } from '../../shared/utils/readDataTransferEntryFiles';
import { readDataTransferDropFromSnapshot } from '../../shared/utils/readDataTransferEntryFiles';
import { addPhotosToExistingPack } from '../drive/addPhotosToExistingPack';
import { createPackFromUpload } from '../drive/createPackFromUpload';
import { gestureDb } from '../db/gestureDb';
import {
  collectLocalFolderUploadImages,
  inferLocalFolderName,
  isLocalFolderUpload,
  resolveUploadCollectionName,
} from '../drive/gestureLocalFolderUpload';
import { filterGestureUploadImageFiles } from '../drive/gesturePackMetadata';
import { resumePackUpload } from '../drive/resumePackUpload';
import { buildUploadActivity } from '../drive/gestureUploadActivity';
import { formatUploadDuplicateSkipMessage } from '../drive/gestureUploadDuplicateFilter';
import type { GestureUploadActivity } from '../types';

type UseGestureCollectionUploadOptions = {
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

export function useGestureCollectionUpload({ onComplete, onError }: UseGestureCollectionUploadOptions) {
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<GestureUploadActivity | null>(null);

  const runUpload = useCallback(
    async (picked: File[], suggestedFolderName?: string) => {
      const fromFolder = Boolean(suggestedFolderName) || isLocalFolderUpload(picked);
      const images = fromFolder ? collectLocalFolderUploadImages(picked) : filterGestureUploadImageFiles(picked);
      if (images.length === 0) {
        setActivity(null);
        onError('Use JPEG, PNG, WebP, GIF, or similar images.');
        return;
      }

      const collectionName = resolveUploadCollectionName(picked, suggestedFolderName);

      setBusy(true);
      setActivity(buildUploadActivity('checking', { total: images.length, collectionName }));
      onError('');

      try {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        setActivity(buildUploadActivity('preparing', { total: images.length, collectionName }));
        const result = await createPackFromUpload(
          token,
          { files: images, name: collectionName },
          (done, total) => {
            setActivity(buildUploadActivity('uploading', { done, total, collectionName }));
          },
          (hashed, total) => {
            setActivity(buildUploadActivity('checking', { done: hashed, total, collectionName }));
          },
        );
        const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
        if (result.imageCount === 0 && result.skippedDuplicates > 0) {
          onComplete(`All ${result.skippedDuplicates} photos were duplicates. Nothing new to upload.`);
          return;
        }
        setActivity(
          buildUploadActivity('finishing', {
            done: result.imageCount,
            total: result.imageCount,
            collectionName,
          }),
        );
        onComplete(
          fromFolder
            ? `Added ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'} to "${result.pack.name}".${dupeSuffix}`
            : `Added ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'}. Tap the collection to name it.${dupeSuffix}`,
        );
      } catch (e) {
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          onError(e.message);
        } else {
          onError(
            e instanceof Error
              ? `${e.message} Check Collections to continue or clean up this upload.`
              : 'Upload failed. Check Collections to continue or clean up.',
          );
        }
      } finally {
        setBusy(false);
        setActivity(null);
      }
    },
    [onComplete, onError],
  );

  const continueUploadForPack = useCallback(
    async (packId: string, picked: File[]) => {
      const collectionName = resolveUploadCollectionName(picked, inferLocalFolderName(picked));
      setBusy(true);
      setActivity(buildUploadActivity('scanning', { scannedCount: picked.length, collectionName }));
      onError('');

      try {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        setActivity(buildUploadActivity('preparing', { collectionName }));
        const result = await resumePackUpload(token, packId, picked, (done, total) => {
          setActivity(buildUploadActivity('uploading', { done, total, collectionName }));
        });
        const dupeSuffix = formatUploadDuplicateSkipMessage(result.skippedDuplicates);
        onComplete(
          result.newlyUploaded > 0
            ? `Uploaded ${result.newlyUploaded} more photo${result.newlyUploaded === 1 ? '' : 's'} to "${result.pack.name}" (${result.skipped} already on Drive).${dupeSuffix}`
            : `Upload complete for "${result.pack.name}".${dupeSuffix}`,
        );
      } catch (e) {
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
    [onComplete, onError],
  );

  const uploadPhotosToPack = useCallback(
    async (packId: string, snapshot: DataTransferDropSnapshot) => {
      setBusy(true);
      setActivity(buildUploadActivity('scanning'));
      onError('');

      try {
        const drop = await readDataTransferDropFromSnapshot(snapshot, {
          onFileFound: (count) => {
            setActivity(buildUploadActivity('scanning', { scannedCount: count }));
          },
        });
        if (drop.files.length === 0) {
          onError('Drop a folder or image files to upload.');
          return;
        }

        const fromFolder = Boolean(drop.suggestedFolderName) || isLocalFolderUpload(drop.files);
        const images = fromFolder
          ? collectLocalFolderUploadImages(drop.files)
          : filterGestureUploadImageFiles(drop.files);
        if (images.length === 0) {
          onError('Use JPEG, PNG, WebP, GIF, or similar images.');
          return;
        }

        setActivity(buildUploadActivity('checking', { total: images.length }));
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const pack = await gestureDb.packs.get(packId);
        const collectionName = pack?.name ?? 'collection';
        const result = await addPhotosToExistingPack(
          token,
          packId,
          drop.files,
          (done, total) => {
            setActivity(buildUploadActivity('uploading', { done, total, collectionName }));
          },
          (hashed, total) => {
            setActivity(buildUploadActivity('checking', { done: hashed, total, collectionName }));
          },
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
        setActivity(
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
    [onComplete, onError],
  );

  const uploadFromSnapshot = useCallback(
    async (snapshot: DataTransferDropSnapshot) => {
      setBusy(true);
      setActivity(buildUploadActivity('scanning'));
      onError('');

      try {
        const drop = await readDataTransferDropFromSnapshot(snapshot, {
          onFileFound: (count) => {
            setActivity(buildUploadActivity('scanning', { scannedCount: count }));
          },
        });
        if (drop.files.length === 0) {
          setBusy(false);
          setActivity(null);
          onError('Drop a folder or image files to upload.');
          return;
        }
        setBusy(false);
        setActivity(null);
        await runUpload(drop.files, drop.suggestedFolderName);
      } catch (e) {
        setBusy(false);
        setActivity(null);
        onError(e instanceof Error ? e.message : 'Could not read dropped folder.');
      }
    },
    [onError, runUpload],
  );

  const uploadFiles = useCallback(
    async (picked: File[], suggestedFolderName?: string) => {
      if (picked.length === 0) return;
      setBusy(true);
      setActivity(buildUploadActivity('scanning', { scannedCount: picked.length }));
      await runUpload(picked, suggestedFolderName);
    },
    [runUpload],
  );

  return { busy, activity, uploadFiles, uploadFromSnapshot, uploadPhotosToPack, continueUploadForPack };
}

export type GestureCollectionUploadHandle = ReturnType<typeof useGestureCollectionUpload>;
