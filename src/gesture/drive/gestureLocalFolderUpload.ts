import { filterGestureUploadImageFiles } from './gesturePackMetadata';

type FileWithRelativePath = File & { webkitRelativePath?: string };

/** True when the file list came from a directory picker (`webkitRelativePath`). */
export function isLocalFolderUpload(files: File[]): boolean {
  return files.some((file) => Boolean((file as FileWithRelativePath).webkitRelativePath?.includes('/')));
}

/**
 * Top-level folder name from a directory upload, e.g. `Hands/refs.jpg` → `Hands`.
 */
export function inferLocalFolderName(files: File[]): string | undefined {
  for (const file of files) {
    const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
    if (!rel) continue;
    const root = rel.split('/')[0]?.trim();
    if (root) return root;
  }
  return undefined;
}

/** Image files from a local folder upload (includes nested subfolders; stored flat in Drive). */
export function collectLocalFolderUploadImages(files: File[]): File[] {
  return filterGestureUploadImageFiles(files);
}

export function resolveUploadCollectionName(
  files: File[],
  suggestedFolderName?: string,
): string | undefined {
  return suggestedFolderName?.trim() || inferLocalFolderName(files);
}
