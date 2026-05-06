/**
 * Tiny localStorage helper for "remember which song the user last had open".
 *
 * Stanza already persists song *content* in IndexedDB via Dexie (`stanzaDb.songs`); what was
 * missing was an "auto-resume on reload" UX. Without this, every page load drops the user back to
 * the empty landing screen even though their library is intact — which feels like Stanza forgot
 * the upload, even though the bytes are right there in the database.
 *
 * URL deep links (`?v=<youtube-id>`) take precedence over this — see `StanzaWorkspace`.
 */

const STORAGE_KEY = 'stanza_last_selected_song_id';

export function readStanzaLastSelectedSongId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export function writeStanzaLastSelectedSongId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id && id.trim()) {
      window.localStorage.setItem(STORAGE_KEY, id.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}
