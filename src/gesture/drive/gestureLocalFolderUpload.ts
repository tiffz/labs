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

export type GestureUploadFileBatch = {
  files: File[];
  suggestedFolderName?: string;
};

/** Split a multi-root directory pick or combined drop into one batch per top-level folder. */
export function splitFilesByTopLevelFolder(files: File[]): GestureUploadFileBatch[] {
  const groups = new Map<string, File[]>();
  const loose: File[] = [];

  for (const file of files) {
    const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
    if (!rel || !rel.includes('/')) {
      loose.push(file);
      continue;
    }
    const root = rel.split('/')[0]?.trim();
    if (!root) {
      loose.push(file);
      continue;
    }
    const list = groups.get(root) ?? [];
    list.push(file);
    groups.set(root, list);
  }

  const batches: GestureUploadFileBatch[] = [...groups.entries()].map(([folderName, batchFiles]) => ({
    files: batchFiles,
    suggestedFolderName: folderName,
  }));
  if (loose.length > 0) batches.push({ files: loose });
  return batches.length > 0 ? batches : [{ files }];
}

export function hasMultipleTopLevelFolders(files: File[]): boolean {
  const roots = new Set<string>();
  for (const file of files) {
    const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
    if (!rel?.includes('/')) continue;
    const root = rel.split('/')[0]?.trim();
    if (root) roots.add(root);
  }
  return roots.size > 1;
}

export function resolveUploadCollectionName(
  files: File[],
  suggestedFolderName?: string,
): string | undefined {
  return suggestedFolderName?.trim() || inferLocalFolderName(files);
}
