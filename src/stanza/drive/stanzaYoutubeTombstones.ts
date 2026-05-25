/** YouTube video deletion tombstones — same lifecycle as Drive file tombstones (ADR 0006). */

const STORAGE_KEY = 'stanza_drive_youtube_tombstones_v1';
export const MAX_STANZA_YOUTUBE_TOMBSTONES = 500;

export interface StanzaYoutubeTombstone {
  videoId: string;
  removedAt: string;
}

interface PersistedShape {
  schemaVersion: 1;
  tombstones: StanzaYoutubeTombstone[];
}

function normalize(tombstones: readonly StanzaYoutubeTombstone[]): StanzaYoutubeTombstone[] {
  const byId = new Map<string, StanzaYoutubeTombstone>();
  for (const t of tombstones) {
    const id = t.videoId?.trim();
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing || existing.removedAt < t.removedAt) {
      byId.set(id, { videoId: id, removedAt: t.removedAt });
    }
  }
  const list = [...byId.values()].sort((a, b) => (a.removedAt > b.removedAt ? -1 : 1));
  if (list.length > MAX_STANZA_YOUTUBE_TOMBSTONES) list.length = MAX_STANZA_YOUTUBE_TOMBSTONES;
  return list;
}

function writePersisted(tombstones: StanzaYoutubeTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tombstones }));
  } catch {
    /* ignore */
  }
}

export function readStanzaYoutubeTombstones(): StanzaYoutubeTombstone[] {
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

export function getStanzaYoutubeTombstoneVideoIds(): Set<string> {
  return new Set(readStanzaYoutubeTombstones().map((t) => t.videoId));
}

export function addStanzaYoutubeTombstone(videoId: string, removedAt: string = new Date().toISOString()): void {
  const trimmed = videoId.trim();
  if (!trimmed) return;
  writePersisted(normalize([...readStanzaYoutubeTombstones(), { videoId: trimmed, removedAt }]));
}

export function clearStanzaYoutubeTombstone(videoId: string): void {
  const trimmed = videoId.trim();
  if (!trimmed) return;
  writePersisted(readStanzaYoutubeTombstones().filter((t) => t.videoId !== trimmed));
}

export function unionStanzaYoutubeTombstones(remote: readonly StanzaYoutubeTombstone[]): StanzaYoutubeTombstone[] {
  const current = readStanzaYoutubeTombstones();
  const next = normalize([...current, ...remote]);
  if (next.length === current.length && next.every((t, i) => t.videoId === current[i]?.videoId)) {
    return current;
  }
  writePersisted(next);
  return next;
}
