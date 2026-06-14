import type { GesturePack, GestureUploadActivity, GestureUploadPhase } from '../types';
import { isGesturePackUploadResolved } from './reconcileStaleGestureUploadPacks';

/** Pack is mid-upload or was interrupted — not ready for practice. */
export function isIncompleteUploadPack(pack: GesturePack, indexedPhotoCount = 0): boolean {
  if (!pack.uploadStatus) return false;
  if (isGesturePackUploadResolved(pack, indexedPhotoCount)) return false;
  return pack.uploadStatus === 'uploading' || pack.uploadStatus === 'incomplete';
}

/** Upload stopped before finishing (not an in-flight session). */
export function isInterruptedUploadPack(pack: GesturePack, indexedPhotoCount = 0): boolean {
  if (isGesturePackUploadResolved(pack, indexedPhotoCount)) return false;
  return pack.uploadStatus === 'incomplete';
}

/** Show recovery banner — hide when indexed photos satisfy the upload ledger. */
export function shouldShowUploadRecoveryBanner(
  pack: GesturePack,
  sessionUploadActive: boolean,
  indexedPhotoCount = 0,
): boolean {
  if (!pack.uploadStatus) return false;
  if (isGesturePackUploadResolved(pack, indexedPhotoCount)) return false;
  if (pack.uploadStatus === 'incomplete') return true;
  if (pack.uploadStatus === 'uploading' && !sessionUploadActive) return true;
  return false;
}

export function formatInterruptedUploadHeadline(pack: GesturePack): string {
  return `Upload interrupted — "${pack.name}"`;
}

export function formatInterruptedUploadSummary(pack: GesturePack, indexedPhotoCount: number): string {
  const onDrive = Math.max(indexedPhotoCount, pack.uploadedFileCount ?? 0);
  const expected = pack.expectedFileCount;
  if (expected != null && expected > 0) {
    if (onDrive >= expected) {
      return `All ${expected} photo${expected === 1 ? '' : 's'} are on Google Drive.`;
    }
    return `${onDrive} of ${expected} photo${expected === 1 ? '' : 's'} on Google Drive.`;
  }
  if (onDrive > 0) {
    return `${onDrive} photo${onDrive === 1 ? '' : 's'} on Drive; the upload did not finish.`;
  }
  return 'The upload started but no photos finished uploading to Drive.';
}

export function buildUploadActivity(
  phase: GestureUploadPhase,
  params?: {
    done?: number;
    total?: number;
    collectionName?: string;
    scannedCount?: number;
    queuedCount?: number;
  },
): GestureUploadActivity {
  const { done, total, collectionName, scannedCount, queuedCount } = params ?? {};
  const queueSuffix =
    queuedCount != null && queuedCount > 0
      ? ` · ${queuedCount} more folder${queuedCount === 1 ? '' : 's'} queued`
      : '';
  const withQueue = (label: string): string => `${label}${queueSuffix}`;
  switch (phase) {
    case 'scanning':
      return {
        phase,
        label: withQueue(
          scannedCount != null && scannedCount > 0
            ? `Reading folder… ${scannedCount} file${scannedCount === 1 ? '' : 's'} found`
            : 'Reading dropped folder…',
        ),
        queuedCount,
      };
    case 'checking':
      return {
        phase,
        label: withQueue(
          total != null && done != null
            ? `Checking for duplicates… ${done} of ${total}`
            : 'Checking for duplicates…',
        ),
        done,
        total,
        collectionName,
        queuedCount,
      };
    case 'preparing':
      return {
        phase,
        label: withQueue(
          collectionName
            ? `Preparing “${collectionName}” on Drive…`
            : 'Preparing collection on Drive…',
        ),
        total,
        collectionName,
        queuedCount,
      };
    case 'uploading':
      return {
        phase,
        label: withQueue(
          total != null && done != null
            ? `Uploading to Drive… ${done} of ${total}`
            : 'Uploading to Drive…',
        ),
        done,
        total,
        collectionName,
        queuedCount,
      };
    case 'finishing':
      return {
        phase,
        label: withQueue('Saving collection…'),
        done,
        total,
        collectionName,
        queuedCount,
      };
    default:
      return { phase: 'preparing', label: withQueue('Preparing upload…'), queuedCount };
  }
}
