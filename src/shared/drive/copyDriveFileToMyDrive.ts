import { DriveHttpError } from './driveFetchErrors';
import {
  driveCopyFile,
  driveGetFileMetadata,
  driveGetMediaBlob,
  driveResolveFileForMedia,
  driveUploadFileResumable,
} from './driveFetch';

/**
 * Copy a Drive file you can READ into a folder you OWN.
 *
 * The case this exists for: a friend sends a Drive link to a performance video. Linking straight to
 * their file id looks like it works and then rots — it depends on their sharing settings, their
 * retention, and their account continuing to exist. Taking a copy is what the user meant by
 * "upload", so do that.
 *
 * Two routes, fastest first:
 *
 *  1. **`files.copy`** — Drive duplicates the bytes server-side and the copy is owned by the caller,
 *     in the folder we name. A multi-gigabyte video takes seconds instead of a round trip through
 *     the browser.
 *  2. **Download and re-upload** — the fallback for anything `files.copy` refuses. The upload leg
 *     is `driveUploadFileResumable`, which chunks, resumes after a network drop, and refuses to
 *     start while offline. The download leg streams, so progress moves from the first byte.
 *
 * The old code went straight to route 2 and downloaded with no progress, so the bar sat at 0% for
 * the whole download (about a minute on a real performance video) and read as broken.
 *
 * Google-native documents (Docs/Sheets/Slides) have no downloadable bytes and are rejected rather
 * than silently producing a broken file.
 */

/** Which leg of the copy is running. `server-copy` and `preparing` have no byte counts. */
export type DriveCopyStage = 'preparing' | 'server-copy' | 'download' | 'upload';

export type DriveCopyProgress = {
  stage: DriveCopyStage;
  /** Whole-copy fraction in [0, 1], or `null` when the stage cannot be measured. */
  fraction: number | null;
  bytesDone?: number;
  /** `null` when Drive did not say how big the file is. */
  bytesTotal?: number | null;
};

export type DriveCopyFailureReason =
  /** Signed-in user cannot read the source at all — wrong account, or never shared with them. */
  | 'no-access'
  /** The link resolves to nothing this user can see. Drive returns 404 for both cases. */
  | 'not-found'
  /** A Google-native doc: export-only, no media bytes. */
  | 'not-a-file'
  /** Anything else (offline, quota, revoked token). `message` carries the detail. */
  | 'failed';

export class DriveCopyError extends Error {
  reason: DriveCopyFailureReason;

  constructor(reason: DriveCopyFailureReason, message: string) {
    super(message);
    this.name = 'DriveCopyError';
    this.reason = reason;
  }
}

/** Google-native types export rather than download; there are no bytes to copy. */
export function isGoogleNativeMimeType(mimeType: string | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('application/vnd.google-apps.');
}

/**
 * Classify a Drive failure into something the UI can act on.
 *
 * 403 and 404 are permanent for this user and must NOT be retried: Drive returns 404 (not 403) for
 * a file that exists but was never shared with you, so "not found" usually means "not yours".
 */
export function classifyDriveCopyFailure(error: unknown): DriveCopyFailureReason {
  if (error instanceof DriveCopyError) return error.reason;
  if (error instanceof DriveHttpError) {
    if (error.status === 403) return 'no-access';
    if (error.status === 404) return 'not-found';
  }
  return 'failed';
}

export type DriveCopyResult = {
  /** Id of the NEW file, in the user's own Drive. */
  fileId: string;
  name: string;
  /** Size of the copy, or `null` when Drive did not report it. */
  bytes: number | null;
  /** Which route produced the copy. */
  via: 'server-copy' | 'download-upload';
};

/**
 * Download and upload are the same bytes, so each gets half the bar. Weighting by measured speed
 * would be more exact, but it shifts the bar backwards mid-copy when the estimate changes.
 */
const DOWNLOAD_SHARE = 0.5;

export async function copyDriveFileToMyDrive(opts: {
  accessToken: string;
  sourceFileId: string;
  /** Destination folder in the user's Drive. */
  parentFolderId: string;
  /** Override the copied file's name; defaults to the source's name. */
  name?: string;
  onProgress?: (progress: DriveCopyProgress) => void;
}): Promise<DriveCopyResult> {
  const { accessToken, sourceFileId, parentFolderId, name, onProgress } = opts;
  onProgress?.({ stage: 'preparing', fraction: null });

  // Follow shortcut chains first: a shared "link" is very often a shortcut.
  const resolved = await driveResolveFileForMedia(accessToken, sourceFileId);
  const meta = await driveGetFileMetadata(accessToken, resolved.mediaFileId, 'id,mimeType,name,size');

  if (isGoogleNativeMimeType(meta.mimeType)) {
    throw new DriveCopyError(
      'not-a-file',
      'That link points to a Google Doc, Sheet or Slide, which has no video or audio to copy.'
    );
  }

  const fileName = name?.trim() || meta.name?.trim() || 'Shared video';
  const metaBytes = Number(meta.size);
  const knownBytes = Number.isFinite(metaBytes) && metaBytes > 0 ? metaBytes : null;

  onProgress?.({ stage: 'server-copy', fraction: null });
  try {
    const copied = await driveCopyFile(accessToken, resolved.mediaFileId, {
      name: fileName,
      parents: [parentFolderId],
    });
    const copiedBytes = Number(copied.size);
    return {
      fileId: copied.id,
      name: copied.name?.trim() || fileName,
      bytes: Number.isFinite(copiedBytes) && copiedBytes > 0 ? copiedBytes : knownBytes,
      via: 'server-copy',
    };
  } catch {
    // Any refusal (scope, owner disabled copying, quota) falls through to the byte path, which
    // raises its own classified error if it cannot work either. Worst case is one extra request.
  }

  const blob = await driveGetMediaBlob(accessToken, resolved.mediaFileId, {
    expectedBytes: knownBytes ?? undefined,
    onProgress: ({ bytesDone, bytesTotal }) => {
      onProgress?.({
        stage: 'download',
        fraction: bytesTotal ? DOWNLOAD_SHARE * Math.min(1, bytesDone / bytesTotal) : null,
        bytesDone,
        bytesTotal,
      });
    },
  });
  if (blob.size === 0) {
    throw new DriveCopyError('failed', 'That file is empty (0 bytes).');
  }

  const file = new File([blob], fileName, {
    type: meta.mimeType || blob.type || 'application/octet-stream',
  });

  const uploaded = await driveUploadFileResumable(accessToken, file, [parentFolderId], fileName, {
    onProgress: ({ bytesSent, bytesTotal }) => {
      onProgress?.({
        stage: 'upload',
        fraction: DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * (bytesTotal > 0 ? Math.min(1, bytesSent / bytesTotal) : 0),
        bytesDone: bytesSent,
        bytesTotal,
      });
    },
  });

  return { fileId: uploaded.id, name: fileName, bytes: blob.size, via: 'download-upload' };
}
