/**
 * Deletion tombstones for Stanza songs that originated from a Google Drive file
 * (`driveSourceFileId`). See [ADR 0006](../../../docs/adr/0006-stanza-drive-backup-merge-and-restore.md)
 * for the full deletion-aware sync design.
 *
 * ## Why tombstones exist
 *
 * The Drive merge in [`mergeDriveRowsIntoLocalLibrary`](./stanzaDriveMerge.ts) is a strict union
 * by `id`: a row that exists on either side is kept on the merged side. That's the right
 * behavior for *additions* — two devices can independently add songs and a later pull picks up
 * both — but it has no way to express *removal*. Without a tombstone, a user who deletes a
 * Drive-backed row on device A can have it silently re-appear because either:
 *
 *   1. Device A reloads inside the auto-push debounce window — Drive still has the row in
 *      `progress.json`, the next session's auto-pull merges it back.
 *   2. Device B still has the row locally, its next edit pushes it back to Drive, device A's
 *      next pull merges it in.
 *
 * Tombstones are the "the user explicitly removed this Drive file id from the library" signal,
 * persisted across reloads (localStorage) and shared cross-device (Drive envelope field
 * `deletedDriveSourceFileIds`). The merge and the deep-link bootstrap both consult them.
 *
 * ## Lifecycle
 *
 * - **Add**: `removeSongById` writes a tombstone whenever the deleted row had a `driveSourceFileId`.
 * - **Clear (single)**: a successful re-import via the `?df=` deep-link prompt explicitly opts
 *   the file back in.
 * - **Propagate**: `buildStanzaDriveEnvelope` includes the local list in every push; the auto-pull
 *   merge unions the remote list into the local store so all devices converge.
 * - **Cap**: kept at {@link MAX_STANZA_DRIVE_TOMBSTONES} most recent entries — bounded so a user
 *   churning through many imports doesn't grow `progress.json` without bound. Tombstones for the
 *   same file id are deduped by keeping the most recent `removedAt`.
 */

const STORAGE_KEY = 'stanza_drive_file_tombstones_v1';

/** Hard cap on the number of persisted tombstones (oldest entries are dropped first). */
export const MAX_STANZA_DRIVE_TOMBSTONES = 500;

/**
 * Fired on this window after the tombstones store is mutated. The native `storage` event does
 * not run in the tab that performed `localStorage.setItem`, so React consumers in the writing
 * tab listen for this custom event to stay in sync.
 */
export const STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT = 'stanza_drive_tombstones_changed';

export interface StanzaDriveTombstone {
  /** Drive file id (`driveSourceFileId`) of the removed song. */
  fileId: string;
  /** ISO timestamp when the user removed this from their Stanza library. */
  removedAt: string;
}

interface PersistedShape {
  schemaVersion: 1;
  tombstones: StanzaDriveTombstone[];
}

function emitChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function writePersisted(tombstones: StanzaDriveTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = { schemaVersion: 1, tombstones };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    emitChanged();
  } catch {
    /* ignore quota / private mode */
  }
}

function isValidTombstone(t: unknown): t is StanzaDriveTombstone {
  if (!t || typeof t !== 'object') return false;
  const o = t as { fileId?: unknown; removedAt?: unknown };
  return typeof o.fileId === 'string' && o.fileId.trim().length > 0 && typeof o.removedAt === 'string';
}

/**
 * Sort + de-dupe by `fileId` keeping the newest `removedAt`, then cap to the most recent
 * {@link MAX_STANZA_DRIVE_TOMBSTONES}. Returns a fresh array.
 */
function normalize(tombstones: readonly StanzaDriveTombstone[]): StanzaDriveTombstone[] {
  const byFileId = new Map<string, StanzaDriveTombstone>();
  for (const t of tombstones) {
    if (!isValidTombstone(t)) continue;
    const existing = byFileId.get(t.fileId);
    if (!existing || existing.removedAt < t.removedAt) {
      byFileId.set(t.fileId, { fileId: t.fileId, removedAt: t.removedAt });
    }
  }
  const list = Array.from(byFileId.values());
  list.sort((a, b) => (a.removedAt > b.removedAt ? -1 : a.removedAt < b.removedAt ? 1 : 0));
  if (list.length > MAX_STANZA_DRIVE_TOMBSTONES) list.length = MAX_STANZA_DRIVE_TOMBSTONES;
  return list;
}

export function readStanzaDriveTombstones(): StanzaDriveTombstone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.tombstones)) return [];
    return normalize(parsed.tombstones);
  } catch {
    return [];
  }
}

/** Convenience: the set of tombstoned Drive file ids — used by the merge filter and bootstrap gate. */
export function getStanzaDriveTombstoneFileIds(): Set<string> {
  return new Set(readStanzaDriveTombstones().map((t) => t.fileId));
}

/** Add (or refresh) a tombstone for the given Drive file id. No-op for blank ids. */
export function addStanzaDriveTombstone(fileId: string, removedAt: string = new Date().toISOString()): void {
  const trimmed = fileId.trim();
  if (!trimmed) return;
  const current = readStanzaDriveTombstones();
  writePersisted(normalize([...current, { fileId: trimmed, removedAt }]));
}

/**
 * Remove the tombstone for a single file id (called when the user explicitly re-imports a
 * previously-removed Drive file via the deep-link "Re-add" prompt).
 */
export function clearStanzaDriveTombstone(fileId: string): void {
  const trimmed = fileId.trim();
  if (!trimmed) return;
  const current = readStanzaDriveTombstones();
  const next = current.filter((t) => t.fileId !== trimmed);
  if (next.length === current.length) return;
  writePersisted(next);
}

/**
 * Union a list of (likely remote) tombstones into the local store. Used by the Drive auto-pull
 * merge so all devices converge on the same deletion set. Returns the post-union list for
 * callers that need it (mainly tests).
 */
export function unionStanzaDriveTombstones(
  remote: readonly StanzaDriveTombstone[],
): StanzaDriveTombstone[] {
  const current = readStanzaDriveTombstones();
  const next = normalize([...current, ...remote]);
  // Skip the write when the union didn't change anything — avoids a no-op `storage` event +
  // re-render storm in tabs that listen via {@link STANZA_DRIVE_TOMBSTONES_CHANGED_EVENT}.
  if (
    next.length === current.length &&
    next.every((t, i) => t.fileId === current[i]?.fileId && t.removedAt === current[i]?.removedAt)
  ) {
    return current;
  }
  writePersisted(next);
  return next;
}

/** Test / debug helper: wipe the entire store. Not wired to any user-facing UI. */
export function clearAllStanzaDriveTombstonesForTesting(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    emitChanged();
  } catch {
    /* ignore */
  }
}
