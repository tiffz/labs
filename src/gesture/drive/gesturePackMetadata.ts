import { isGestureReferenceImageFile } from './gestureImageFilter';

const INVALID_DRIVE_NAME = /[\\/:*?"<>|]/g;

/** Safe folder title for a new Drive reference pack folder. */
export function sanitizePackFolderName(raw: string): string {
  const trimmed = raw.trim().replace(INVALID_DRIVE_NAME, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmed) return defaultUploadCollectionName();
  return trimmed.slice(0, 80);
}

/** Default Drive folder title when the user skips naming. */
export function defaultUploadCollectionName(date = new Date()): string {
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Collection ${label}`;
}

export function isDefaultCollectionName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed === 'Reference pack' || /^Collection .+/.test(trimmed);
}

/** Local image files accepted for upload into a reference pack. */
export function filterGestureUploadImageFiles(files: File[]): File[] {
  return files.filter((f) => isGestureReferenceImageFile({ name: f.name, mimeType: f.type }));
}

/** Image files with non-zero size — safe to send to Drive. */
export function filterUploadableGestureImageFiles(files: File[]): File[] {
  return filterGestureUploadImageFiles(files).filter((file) => file.size > 0);
}
