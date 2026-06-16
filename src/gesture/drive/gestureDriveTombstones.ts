/**
 * Deletion tombstones for Gesture collections (Drive folder ids) and indexed photos
 * (Drive file ids). Without these, union-merge sync resurrects rows another device removed.
 *
 * Persisted in localStorage and included in `progress.json` on every push so all devices
 * converge on the same deletion set (see docs/LOCAL_FIRST_SYNC.md).
 */

const STORAGE_KEY = 'gesture_drive_tombstones_v1';

export const MAX_GESTURE_DRIVE_FOLDER_TOMBSTONES = 200;
export const MAX_GESTURE_DRIVE_FILE_TOMBSTONES = 2000;

export interface GestureDriveFolderTombstone {
  folderId: string;
  removedAt: string;
}

export interface GestureDriveFileTombstone {
  fileId: string;
  removedAt: string;
}

export interface GestureDriveTombstoneState {
  deletedDriveFolderIds: GestureDriveFolderTombstone[];
  deletedDriveFileIds: GestureDriveFileTombstone[];
}

interface PersistedShape {
  schemaVersion: 1;
  deletedDriveFolderIds: GestureDriveFolderTombstone[];
  deletedDriveFileIds: GestureDriveFileTombstone[];
}

function isValidFolderTombstone(t: unknown): t is GestureDriveFolderTombstone {
  if (!t || typeof t !== 'object') return false;
  const o = t as { folderId?: unknown; removedAt?: unknown };
  return typeof o.folderId === 'string' && o.folderId.trim().length > 0 && typeof o.removedAt === 'string';
}

function isValidFileTombstone(t: unknown): t is GestureDriveFileTombstone {
  if (!t || typeof t !== 'object') return false;
  const o = t as { fileId?: unknown; removedAt?: unknown };
  return typeof o.fileId === 'string' && o.fileId.trim().length > 0 && typeof o.removedAt === 'string';
}

function normalizeFolders(tombstones: readonly GestureDriveFolderTombstone[]): GestureDriveFolderTombstone[] {
  const byId = new Map<string, GestureDriveFolderTombstone>();
  for (const t of tombstones) {
    if (!isValidFolderTombstone(t)) continue;
    const existing = byId.get(t.folderId);
    if (!existing || existing.removedAt < t.removedAt) {
      byId.set(t.folderId, { folderId: t.folderId, removedAt: t.removedAt });
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => (a.removedAt > b.removedAt ? -1 : a.removedAt < b.removedAt ? 1 : 0));
  if (list.length > MAX_GESTURE_DRIVE_FOLDER_TOMBSTONES) list.length = MAX_GESTURE_DRIVE_FOLDER_TOMBSTONES;
  return list;
}

function normalizeFiles(tombstones: readonly GestureDriveFileTombstone[]): GestureDriveFileTombstone[] {
  const byId = new Map<string, GestureDriveFileTombstone>();
  for (const t of tombstones) {
    if (!isValidFileTombstone(t)) continue;
    const existing = byId.get(t.fileId);
    if (!existing || existing.removedAt < t.removedAt) {
      byId.set(t.fileId, { fileId: t.fileId, removedAt: t.removedAt });
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => (a.removedAt > b.removedAt ? -1 : a.removedAt < b.removedAt ? 1 : 0));
  if (list.length > MAX_GESTURE_DRIVE_FILE_TOMBSTONES) list.length = MAX_GESTURE_DRIVE_FILE_TOMBSTONES;
  return list;
}

function writePersisted(state: GestureDriveTombstoneState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = {
      schemaVersion: 1,
      deletedDriveFolderIds: state.deletedDriveFolderIds,
      deletedDriveFileIds: state.deletedDriveFileIds,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readGestureDriveTombstones(): GestureDriveTombstoneState {
  if (typeof window === 'undefined') {
    return { deletedDriveFolderIds: [], deletedDriveFileIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { deletedDriveFolderIds: [], deletedDriveFileIds: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (parsed?.schemaVersion !== 1) return { deletedDriveFolderIds: [], deletedDriveFileIds: [] };
    return {
      deletedDriveFolderIds: normalizeFolders(parsed.deletedDriveFolderIds ?? []),
      deletedDriveFileIds: normalizeFiles(parsed.deletedDriveFileIds ?? []),
    };
  } catch {
    return { deletedDriveFolderIds: [], deletedDriveFileIds: [] };
  }
}

export function getTombstonedFolderIds(): Set<string> {
  return new Set(readGestureDriveTombstones().deletedDriveFolderIds.map((t) => t.folderId));
}

export function getTombstonedFileIds(): Set<string> {
  return new Set(readGestureDriveTombstones().deletedDriveFileIds.map((t) => t.fileId));
}

export function addGestureDriveFolderTombstone(
  folderId: string,
  removedAt: string = new Date().toISOString(),
): void {
  const trimmed = folderId.trim();
  if (!trimmed) return;
  const current = readGestureDriveTombstones();
  writePersisted({
    ...current,
    deletedDriveFolderIds: normalizeFolders([
      ...current.deletedDriveFolderIds,
      { folderId: trimmed, removedAt },
    ]),
  });
}

export function addGestureDriveFileTombstones(
  fileIds: readonly string[],
  removedAt: string = new Date().toISOString(),
): void {
  const additions = fileIds
    .map((id) => id.trim())
    .filter(Boolean)
    .map((fileId) => ({ fileId, removedAt }));
  if (additions.length === 0) return;
  const current = readGestureDriveTombstones();
  writePersisted({
    ...current,
    deletedDriveFileIds: normalizeFiles([...current.deletedDriveFileIds, ...additions]),
  });
}

export function clearGestureDriveFolderTombstone(folderId: string): void {
  const trimmed = folderId.trim();
  if (!trimmed) return;
  const current = readGestureDriveTombstones();
  const next = current.deletedDriveFolderIds.filter((t) => t.folderId !== trimmed);
  if (next.length === current.deletedDriveFolderIds.length) return;
  writePersisted({ ...current, deletedDriveFolderIds: next });
}

export function clearGestureDriveFileTombstone(fileId: string): void {
  const trimmed = fileId.trim();
  if (!trimmed) return;
  const current = readGestureDriveTombstones();
  const next = current.deletedDriveFileIds.filter((t) => t.fileId !== trimmed);
  if (next.length === current.deletedDriveFileIds.length) return;
  writePersisted({ ...current, deletedDriveFileIds: next });
}

export function unionGestureDriveTombstones(remote: Partial<GestureDriveTombstoneState>): GestureDriveTombstoneState {
  const current = readGestureDriveTombstones();
  const next: GestureDriveTombstoneState = {
    deletedDriveFolderIds: normalizeFolders([
      ...current.deletedDriveFolderIds,
      ...(remote.deletedDriveFolderIds ?? []),
    ]),
    deletedDriveFileIds: normalizeFiles([
      ...current.deletedDriveFileIds,
      ...(remote.deletedDriveFileIds ?? []),
    ]),
  };
  const unchanged =
    next.deletedDriveFolderIds.length === current.deletedDriveFolderIds.length &&
    next.deletedDriveFileIds.length === current.deletedDriveFileIds.length &&
    next.deletedDriveFolderIds.every(
      (t, i) =>
        t.folderId === current.deletedDriveFolderIds[i]?.folderId &&
        t.removedAt === current.deletedDriveFolderIds[i]?.removedAt,
    ) &&
    next.deletedDriveFileIds.every(
      (t, i) =>
        t.fileId === current.deletedDriveFileIds[i]?.fileId &&
        t.removedAt === current.deletedDriveFileIds[i]?.removedAt,
    );
  if (!unchanged) writePersisted(next);
  return unchanged ? current : next;
}

export function clearAllGestureDriveTombstonesForTesting(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
