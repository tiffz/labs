import { DriveHttpError } from './driveFetchErrors';
import {
  driveGetFileMetadata,
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
  driveUploadFileResumable,
} from './driveFetch';

/**
 * Copy a Drive file you can READ into a folder you OWN, by downloading its bytes and re-uploading.
 *
 * The case this exists for: a friend sends a Drive link to a performance video. Linking straight to
 * their file id looks like it works and then rots — it depends on their sharing settings, their
 * retention, and their account continuing to exist. Taking a copy is what the user meant by
 * "upload", so do that.
 *
 * Download-and-reupload rather than Drive's own `files/copy` because copy still writes into a
 * quota-and-ownership context that depends on the source, and because the byte path is already
 * hardened here: `driveUploadFileResumable` chunks, resumes after a network drop, and refuses to
 * start while offline.
 *
 * Google-native documents (Docs/Sheets/Slides) have no downloadable bytes and are rejected rather
 * than silently producing a broken file.
 */

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
  bytes: number;
};

export async function copyDriveFileToMyDrive(opts: {
  accessToken: string;
  sourceFileId: string;
  /** Destination folder in the user's Drive. */
  parentFolderId: string;
  /** Override the copied file's name; defaults to the source's name. */
  name?: string;
  onProgress?: (progress: { bytesSent: number; bytesTotal: number }) => void;
}): Promise<DriveCopyResult> {
  const { accessToken, sourceFileId, parentFolderId, name, onProgress } = opts;

  // Follow shortcut chains first: a shared "link" is very often a shortcut.
  const resolved = await driveResolveFileForMedia(accessToken, sourceFileId);
  const meta = await driveGetFileMetadata(accessToken, resolved.mediaFileId);

  if (isGoogleNativeMimeType(meta.mimeType)) {
    throw new DriveCopyError(
      'not-a-file',
      'That link points to a Google Doc, Sheet or Slide, which has no video or audio to copy.'
    );
  }

  const bytes = await driveGetMediaArrayBuffer(accessToken, resolved.mediaFileId);
  if (bytes.byteLength === 0) {
    throw new DriveCopyError('failed', 'That file is empty (0 bytes).');
  }

  const fileName = name?.trim() || meta.name?.trim() || 'Shared video';
  const file = new File([bytes], fileName, {
    type: meta.mimeType || 'application/octet-stream',
  });

  const uploaded = await driveUploadFileResumable(
    accessToken,
    file,
    [parentFolderId],
    fileName,
    { onProgress }
  );

  return { fileId: uploaded.id, name: fileName, bytes: bytes.byteLength };
}
