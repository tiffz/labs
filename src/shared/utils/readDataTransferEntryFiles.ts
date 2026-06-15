type FileWithRelativePath = File & { webkitRelativePath?: string };

export type DataTransferDrop = {
  files: File[];
  /** Set when the user dropped a single folder (or directory picker). */
  suggestedFolderName?: string;
};

/** Captured synchronously during `drop` — DataTransfer is cleared after the event turn. */
export type DataTransferDropSnapshot = {
  entries: FileSystemEntry[];
  looseFiles: File[];
  /** Full `dataTransfer.files` list (sync); used when `items` under-reports folder count. */
  snapshotFiles: File[];
  suggestedFolderName?: string;
  /** Number of file items in the drop (for multi-folder drag diagnostics). */
  fileItemCount: number;
};

function fileWithRelativePath(file: File, relativePath: string): File {
  if ((file as FileWithRelativePath).webkitRelativePath === relativePath) return file;
  const tagged = file as FileWithRelativePath;
  try {
    Object.defineProperty(tagged, 'webkitRelativePath', {
      value: relativePath,
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* read-only in some environments */
  }
  return tagged;
}

function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const batch: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(batch);
            return;
          }
          batch.push(...entries);
          readBatch();
        },
        reject,
      );
    };
    readBatch();
  });
}

async function readEntryFiles(entry: FileSystemEntry, pathPrefix: string): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    const rel = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
    return [fileWithRelativePath(file, rel)];
  }

  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await readDirectoryEntries(reader);
  const nested: File[] = [];
  for (const child of children) {
    if (child.isFile) {
      nested.push(...(await readEntryFiles(child, pathPrefix)));
      continue;
    }
    if (child.isDirectory) {
      const childPrefix = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
      nested.push(...(await readEntryFiles(child, childPrefix)));
    }
  }
  return nested;
}

function topLevelFolderRoots(files: File[]): Set<string> {
  const roots = new Set<string>();
  for (const file of files) {
    const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
    if (!rel?.includes('/')) continue;
    const root = rel.split('/')[0]?.trim();
    if (root) roots.add(root);
  }
  return roots;
}

function batchesFromRelativePaths(files: File[]): DataTransferDrop[] | null {
  const roots = topLevelFolderRoots(files);
  if (roots.size <= 1) return null;

  const groups = new Map<string, File[]>();
  const loose: File[] = [];

  for (const file of files) {
    const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
    if (!rel?.includes('/')) {
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

  const batches: DataTransferDrop[] = [...groups.entries()].map(([folderName, batchFiles]) => ({
    files: batchFiles,
    suggestedFolderName: folderName,
  }));
  if (loose.length > 0) batches.push({ files: loose });
  return batches.length > 0 ? batches : null;
}

/** True when snapshot files span multiple top-level folder roots (multi-folder drag). */
export function snapshotHasMultipleTopLevelFolders(snapshot: DataTransferDropSnapshot): boolean {
  return topLevelFolderRoots(snapshot.snapshotFiles).size > 1;
}

function suggestedFolderNameFromEntries(entries: FileSystemEntry[]): string | undefined {
  const directories = entries.filter((entry) => entry.isDirectory);
  return directories.length === 1 && entries.length === 1 ? directories[0]?.name : undefined;
}

/**
 * Snapshots drop payload synchronously during the `drop` handler. Must run before any `await`.
 */
export function collectDataTransferDropSnapshot(dataTransfer: DataTransfer): DataTransferDropSnapshot {
  const entries: FileSystemEntry[] = [];
  const looseFiles: File[] = [];
  let fileItemCount = 0;

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || item.kind !== 'file') continue;
      fileItemCount += 1;
      const entry = item.webkitGetAsEntry?.() ?? null;
      if (entry) {
        entries.push(entry);
        continue;
      }
      const file = item.getAsFile();
      if (file) looseFiles.push(file);
    }
  }

  if (entries.length === 0 && looseFiles.length === 0 && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i += 1) {
      const file = dataTransfer.files[i];
      if (file) looseFiles.push(file);
    }
  }

  const snapshotFiles: File[] = [];
  for (let i = 0; i < dataTransfer.files.length; i += 1) {
    const file = dataTransfer.files[i];
    if (file) snapshotFiles.push(file);
  }

  return {
    entries,
    looseFiles,
    snapshotFiles,
    suggestedFolderName: suggestedFolderNameFromEntries(entries),
    fileItemCount,
  };
}

/** Traverses a synchronous snapshot (folder tree reads may await). */
export async function readDataTransferDropFromSnapshot(
  snapshot: DataTransferDropSnapshot,
  options?: { onFileFound?: (count: number) => void },
): Promise<DataTransferDrop> {
  const files: File[] = [...snapshot.looseFiles];
  if (options?.onFileFound && files.length > 0) {
    options.onFileFound(files.length);
  }

  for (const entry of snapshot.entries) {
    const prefix = entry.isDirectory ? entry.name : '';
    const batch = await readEntryFiles(entry, prefix);
    files.push(...batch);
    options?.onFileFound?.(files.length);
  }

  const suggestedFolderName =
    snapshot.suggestedFolderName ?? suggestedFolderNameFromEntries(snapshot.entries);

  return { files, suggestedFolderName };
}

/**
 * Reads dropped files from a DataTransfer, traversing folders when the browser
 * exposes `webkitGetAsEntry` (required for folder drag-and-drop).
 */
export async function readDataTransferDrop(dataTransfer: DataTransfer): Promise<DataTransferDrop> {
  return readDataTransferDropFromSnapshot(collectDataTransferDropSnapshot(dataTransfer));
}

/** One batch per dropped folder when multiple top-level directories are present. */
export async function readDataTransferDropBatches(
  snapshot: DataTransferDropSnapshot,
  options?: { onFileFound?: (count: number) => void },
): Promise<DataTransferDrop[]> {
  const fromSnapshotFiles = batchesFromRelativePaths(snapshot.snapshotFiles);
  if (fromSnapshotFiles && fromSnapshotFiles.length > 1) {
    let count = 0;
    for (const batch of fromSnapshotFiles) {
      count += batch.files.length;
      options?.onFileFound?.(count);
    }
    return fromSnapshotFiles;
  }

  const directoryEntries = snapshot.entries.filter((entry) => entry.isDirectory);
  if (directoryEntries.length > 1) {
    const batches: DataTransferDrop[] = [];
    for (const entry of directoryEntries) {
      const files = await readEntryFiles(entry, entry.name);
      options?.onFileFound?.(files.length);
      batches.push({ files, suggestedFolderName: entry.name });
    }
    if (snapshot.looseFiles.length > 0) {
      batches.push({ files: [...snapshot.looseFiles] });
    }
    return batches;
  }

  const drop = await readDataTransferDropFromSnapshot(snapshot, options);
  if (drop.files.length === 0) return [];
  return [drop];
}
