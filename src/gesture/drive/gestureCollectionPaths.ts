import { localFileRelativePath } from './gestureUploadManifest';
import { sanitizeDriveFileName } from './gestureDriveUploadFileName';

/** Path within the collection root, e.g. `Hands/nested/a.jpg` → `nested/a.jpg`. */
export function collectionRelativePath(file: File, collectionRootName?: string): string {
  const rel = localFileRelativePath(file).replace(/\\/g, '/');
  if (!rel.includes('/')) return rel;
  const parts = rel.split('/').filter(Boolean);
  if (parts.length === 0) return file.name;
  const root = collectionRootName?.trim();
  if (root && parts[0] === root) {
    const rest = parts.slice(1);
    return rest.length > 0 ? rest.join('/') : parts[parts.length - 1]!;
  }
  return rel;
}

export function subfolderSegments(collectionRelative: string): string[] {
  const normalized = collectionRelative.replace(/\\/g, '/').trim();
  if (!normalized.includes('/')) return [];
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts;
}

export function basenameFromCollectionPath(collectionRelative: string): string {
  const normalized = collectionRelative.replace(/\\/g, '/').trim();
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

/** Stable pack-file / manifest key — collection-relative path. */
export function gestureCollectionFileKey(file: File, collectionRootName?: string): string {
  return collectionRelativePath(file, collectionRootName);
}

export function sanitizeDriveFolderSegment(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned || 'Folder';
}

export function driveUploadBasename(file: File, collectionRootName?: string): string {
  const rel = collectionRelativePath(file, collectionRootName);
  return sanitizeDriveFileName(basenameFromCollectionPath(rel));
}
