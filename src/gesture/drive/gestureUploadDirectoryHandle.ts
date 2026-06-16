import { gestureDb } from '../db/gestureDb';
import { readDirectoryHandleFiles } from './gestureFolderPicker';

type DirectoryHandleWithPermission = FileSystemDirectoryHandle & {
  queryPermission: (descriptor: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission: (descriptor: { mode: 'read' }) => Promise<PermissionState>;
};

async function ensureDirectoryReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const fsHandle = handle as DirectoryHandleWithPermission;
  const opts = { mode: 'read' } as const;
  const current = await fsHandle.queryPermission(opts);
  if (current === 'granted') return true;
  const requested = await fsHandle.requestPermission(opts);
  return requested === 'granted';
}

export async function saveUploadDirectoryHandle(
  packId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await gestureDb.uploadDirectoryHandles.put({
    packId,
    folderName: handle.name,
    handle,
    savedAt: Date.now(),
  });
}

export async function getUploadDirectoryHandle(packId: string): Promise<FileSystemDirectoryHandle | null> {
  const row = await gestureDb.uploadDirectoryHandles.get(packId);
  return row?.handle ?? null;
}

export async function clearUploadDirectoryHandle(packId: string): Promise<void> {
  await gestureDb.uploadDirectoryHandles.delete(packId);
}

/** Re-read folder files when a persisted picker handle is available. */
export async function readFilesFromPersistedDirectoryHandle(
  packId: string,
): Promise<File[] | null> {
  const row = await gestureDb.uploadDirectoryHandles.get(packId);
  if (!row?.handle) return null;
  if (!(await ensureDirectoryReadPermission(row.handle))) return null;
  return readDirectoryHandleFiles(row.handle, row.folderName);
}

export async function hasPersistedUploadDirectoryHandle(packId: string): Promise<boolean> {
  const row = await gestureDb.uploadDirectoryHandles.get(packId);
  return Boolean(row?.handle);
}
