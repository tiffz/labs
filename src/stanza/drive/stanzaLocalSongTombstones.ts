/**
 * Deletion tombstones for **keyless local** Stanza songs — uploads with no `ytId` and no
 * `driveSourceFileId`. See [ADR 0027](../../../docs/adr/0027-stanza-organize-cross-source-merge-contract.md).
 *
 * ## Why a third tombstone store
 *
 * `stanzaDriveTombstones` keys deletions by `driveSourceFileId` and `stanzaYoutubeTombstones` by
 * `ytId`. A pure local upload has neither: cross-device it is matched only by `localMediaFingerprint`,
 * and its `id` is a per-device UUID. When Organize merges such a row away, the Drive envelope may
 * still carry it (this device pushed it before the merge, or a sibling device holds it). On the next
 * pull, `mergeDriveRowsIntoLocalLibrary` re-materializes the dropped row from its Drive metadata
 * (`stanzaLocalUploadPracticeRowFromDriveMetadata`) — a resurrection, and worse, a blob-less broken
 * row. An **id-level** tombstone is the "this exact row was removed" signal that stops it.
 *
 * ## Cross-device caveat (documented, MVP-acceptable)
 *
 * Because the key is a per-device row `id`, this store stops resurrection from **this device's own**
 * Drive copy and from any device that pulled the same envelope row id. A sibling device that still
 * holds an independently-minted row for the same upload (a different `id`, same
 * `localMediaFingerprint`) can still re-push it. A fingerprint-level tombstone would close that gap
 * but risks tombstoning a genuinely different upload that shares `size:duration`; ADR 0027 scopes
 * the id-level store for Phase 1 and defers the fingerprint variant.
 */

const STORAGE_KEY = 'stanza_local_song_tombstones_v1';

/** Hard cap on persisted tombstones (oldest dropped first), matching the sibling stores. */
export const MAX_STANZA_LOCAL_SONG_TOMBSTONES = 500;

/** Fired after the store mutates so the writing tab (no native `storage` event) can react. */
export const STANZA_LOCAL_SONG_TOMBSTONES_CHANGED_EVENT = 'stanza_local_song_tombstones_changed';

export interface StanzaLocalSongTombstone {
  /** Per-device row `id` of the removed keyless local upload. */
  songId: string;
  /** ISO timestamp when the user removed it. */
  removedAt: string;
}

interface PersistedShape {
  schemaVersion: 1;
  tombstones: StanzaLocalSongTombstone[];
}

function emitChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(STANZA_LOCAL_SONG_TOMBSTONES_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function isValid(t: unknown): t is StanzaLocalSongTombstone {
  if (!t || typeof t !== 'object') return false;
  const o = t as { songId?: unknown; removedAt?: unknown };
  return typeof o.songId === 'string' && o.songId.trim().length > 0 && typeof o.removedAt === 'string';
}

function normalize(
  tombstones: readonly StanzaLocalSongTombstone[],
): StanzaLocalSongTombstone[] {
  const bySongId = new Map<string, StanzaLocalSongTombstone>();
  for (const t of tombstones) {
    if (!isValid(t)) continue;
    const existing = bySongId.get(t.songId);
    if (!existing || existing.removedAt < t.removedAt) {
      bySongId.set(t.songId, { songId: t.songId, removedAt: t.removedAt });
    }
  }
  const list = [...bySongId.values()].sort((a, b) =>
    a.removedAt > b.removedAt ? -1 : a.removedAt < b.removedAt ? 1 : 0,
  );
  if (list.length > MAX_STANZA_LOCAL_SONG_TOMBSTONES) list.length = MAX_STANZA_LOCAL_SONG_TOMBSTONES;
  return list;
}

function writePersisted(tombstones: StanzaLocalSongTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = { schemaVersion: 1, tombstones };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    emitChanged();
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStanzaLocalSongTombstones(): StanzaLocalSongTombstone[] {
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

/** The set of tombstoned local song ids — used by the Drive merge filter. */
export function getStanzaLocalSongTombstoneIds(): Set<string> {
  return new Set(readStanzaLocalSongTombstones().map((t) => t.songId));
}

/** Add (or refresh) a tombstone for the given keyless local song id. No-op for blank ids. */
export function addStanzaLocalSongTombstone(
  songId: string,
  removedAt: string = new Date().toISOString(),
): void {
  const trimmed = songId.trim();
  if (!trimmed) return;
  writePersisted(normalize([...readStanzaLocalSongTombstones(), { songId: trimmed, removedAt }]));
}

/** Remove a single tombstone (e.g. an undo that restores the dropped row). */
export function clearStanzaLocalSongTombstone(songId: string): void {
  const trimmed = songId.trim();
  if (!trimmed) return;
  const current = readStanzaLocalSongTombstones();
  const next = current.filter((t) => t.songId !== trimmed);
  if (next.length === current.length) return;
  writePersisted(next);
}

/** Union remote tombstones into the local store (Drive pull convergence). */
export function unionStanzaLocalSongTombstones(
  remote: readonly StanzaLocalSongTombstone[],
): StanzaLocalSongTombstone[] {
  const current = readStanzaLocalSongTombstones();
  const next = normalize([...current, ...remote]);
  if (
    next.length === current.length &&
    next.every((t, i) => t.songId === current[i]?.songId && t.removedAt === current[i]?.removedAt)
  ) {
    return current;
  }
  writePersisted(next);
  return next;
}

/** Test / debug helper: wipe the entire store. */
export function clearAllStanzaLocalSongTombstonesForTesting(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    emitChanged();
  } catch {
    /* ignore */
  }
}
