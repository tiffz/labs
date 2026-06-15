type FileWithRelativePath = File & { webkitRelativePath?: string };

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
};

function fileWithRelativePath(file: File, relativePath: string): File {
  if ((file as FileWithRelativePath).webkitRelativePath === relativePath) return file;
  const tagged = file as FileWithRelativePath;
  Object.defineProperty(tagged, 'webkitRelativePath', {
    value: relativePath,
    configurable: true,
    enumerable: true,
  });
  return tagged;
}

type DirectoryHandleWithValues = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemHandle>;
};

/** Read all files from a File System Access directory handle (nested subfolders included). */
export async function readDirectoryHandleFiles(
  handle: FileSystemDirectoryHandle,
  pathPrefix: string,
): Promise<File[]> {
  const files: File[] = [];
  const dir = handle as DirectoryHandleWithValues;
  for await (const entry of dir.values()) {
    const name = entry.name;
    if (entry.kind === 'file') {
      const file = await (entry as FileSystemFileHandle).getFile();
      const rel = pathPrefix ? `${pathPrefix}/${name}` : name;
      files.push(fileWithRelativePath(file, rel));
      continue;
    }
    if (entry.kind === 'directory') {
      const childPrefix = pathPrefix ? `${pathPrefix}/${name}` : name;
      files.push(...(await readDirectoryHandleFiles(entry as FileSystemDirectoryHandle, childPrefix)));
    }
  }
  return files;
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Native folder picker when available; returns files with `webkitRelativePath` set. */
export async function pickLocalFolderFiles(): Promise<File[] | null> {
  const pickerWindow = window as DirectoryPickerWindow;
  if (!pickerWindow.showDirectoryPicker) return null;
  const handle = await pickerWindow.showDirectoryPicker({ mode: 'read' });
  return readDirectoryHandleFiles(handle, handle.name);
}
