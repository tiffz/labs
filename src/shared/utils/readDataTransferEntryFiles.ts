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
  suggestedFolderName?: string;
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

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || item.kind !== 'file') continue;
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
    looseFiles.push(...dataTransfer.files);
  }

  return {
    entries,
    looseFiles,
    suggestedFolderName: suggestedFolderNameFromEntries(entries),
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
