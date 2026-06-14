import type { GesturePack, GestureUploadActivity, GestureUploadPhase } from '../types';

/** Pack is mid-upload or was interrupted — not ready for practice. */
export function isIncompleteUploadPack(pack: GesturePack): boolean {
  return pack.uploadStatus === 'uploading' || pack.uploadStatus === 'incomplete';
}

/** Upload stopped before finishing (not an in-flight session). */
export function isInterruptedUploadPack(pack: GesturePack): boolean {
  return pack.uploadStatus === 'incomplete';
}

/** Show recovery banner — hide while this tab is actively uploading the same flow. */
export function shouldShowUploadRecoveryBanner(pack: GesturePack, sessionUploadActive: boolean): boolean {
  if (pack.uploadStatus === 'incomplete') return true;
  if (pack.uploadStatus === 'uploading' && !sessionUploadActive) return true;
  return false;
}

export function formatInterruptedUploadHeadline(pack: GesturePack): string {
  return `Upload interrupted — "${pack.name}"`;
}

export function formatInterruptedUploadSummary(pack: GesturePack, indexedPhotoCount: number): string {
  const manifestTotal = pack.expectedFileCount;
  const uploaded = pack.uploadedFileCount ?? indexedPhotoCount;
  if (manifestTotal != null && manifestTotal > 0) {
    return `${uploaded} of ${manifestTotal} photo${manifestTotal === 1 ? '' : 's'} reached Google Drive before the upload stopped.`;
  }
  if (indexedPhotoCount > 0) {
    return `${indexedPhotoCount} photo${indexedPhotoCount === 1 ? '' : 's'} on Drive; the upload did not finish.`;
  }
  return 'The upload started but no photos finished uploading to Drive.';
}

export function buildUploadActivity(
  phase: GestureUploadPhase,
  params?: { done?: number; total?: number; collectionName?: string; scannedCount?: number },
): GestureUploadActivity {
  const { done, total, collectionName, scannedCount } = params ?? {};
  switch (phase) {
    case 'scanning':
      return {
        phase,
        label:
          scannedCount != null && scannedCount > 0
            ? `Reading folder… ${scannedCount} file${scannedCount === 1 ? '' : 's'} found`
            : 'Reading dropped folder…',
      };
    case 'checking':
      return {
        phase,
        label:
          total != null && done != null
            ? `Checking for duplicates… ${done} of ${total}`
            : 'Checking for duplicates…',
        done,
        total,
        collectionName,
      };
    case 'preparing':
      return {
        phase,
        label: collectionName
          ? `Preparing “${collectionName}” on Drive…`
          : 'Preparing collection on Drive…',
        total,
        collectionName,
      };
    case 'uploading':
      return {
        phase,
        label:
          total != null && done != null
            ? `Uploading to Drive… ${done} of ${total}`
            : 'Uploading to Drive…',
        done,
        total,
        collectionName,
      };
    case 'finishing':
      return {
        phase,
        label: 'Saving collection…',
        done,
        total,
        collectionName,
      };
    default:
      return { phase: 'preparing', label: 'Preparing upload…' };
  }
}
