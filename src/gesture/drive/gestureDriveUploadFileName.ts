import { localFileRelativePath } from './gestureUploadManifest';

const INVALID_DRIVE_NAME = /[\\/:*?"<>|]/g;
const MAX_DRIVE_NAME_LEN = 200;

function sanitizeDriveFileName(raw: string): string {
  const cleaned = raw.replace(INVALID_DRIVE_NAME, '_').replace(/\s+/g, ' ').trim();
  return cleaned || 'photo.jpg';
}

/** Flatten a folder-relative path into a unique Drive file name. */
export function gestureDriveUploadFileNameFromRelativePath(relativePath: string, basename: string): string {
  const rel = relativePath.trim();
  if (!rel || rel === basename || !rel.includes('/')) {
    return sanitizeDriveFileName(basename);
  }
  const flat = rel.replace(/\//g, '__');
  return sanitizeDriveFileName(flat.slice(0, MAX_DRIVE_NAME_LEN));
}

/** Drive file name for a local upload (avoids basename collisions across subfolders). */
export function gestureDriveUploadFileName(file: File): string {
  return gestureDriveUploadFileNameFromRelativePath(localFileRelativePath(file), file.name);
}

/** Append _2, _3, … before extension when flattening still collides within one batch. */
export function gestureDriveUploadFileNameWithSuffix(baseName: string, suffix: number): string {
  if (suffix <= 1) return baseName;
  const dot = baseName.lastIndexOf('.');
  if (dot <= 0) return sanitizeDriveFileName(`${baseName}_${suffix}`);
  const stem = baseName.slice(0, dot);
  const ext = baseName.slice(dot);
  return sanitizeDriveFileName(`${stem}_${suffix}${ext}`);
}
