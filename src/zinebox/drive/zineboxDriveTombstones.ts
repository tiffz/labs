import {
  mergePortfolioTombstoneLists,
  normalizePortfolioTombstones,
  type LabsPortfolioTombstone,
} from '../../shared/drive/labsPortfolioDriveTombstones';

const STORAGE_KEY = 'zinebox_drive_comic_tombstones_v1';

export const MAX_ZINEBOX_COMIC_TOMBSTONES = 500;

export const ZINEBOX_DRIVE_COMIC_TOMBSTONES_CHANGED_EVENT = 'zinebox_drive_comic_tombstones_changed';

export type ZineboxComicTombstone = LabsPortfolioTombstone;

interface PersistedShape {
  schemaVersion: 1;
  tombstones: ZineboxComicTombstone[];
}

function emitChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(ZINEBOX_DRIVE_COMIC_TOMBSTONES_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function writePersisted(tombstones: ZineboxComicTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = { schemaVersion: 1, tombstones };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    emitChanged();
  } catch {
    /* quota */
  }
}

function readPersisted(): ZineboxComicTombstone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!Array.isArray(parsed.tombstones)) return [];
    return normalizePortfolioTombstoneList(parsed.tombstones);
  } catch {
    return [];
  }
}

export function normalizePortfolioTombstoneList(
  tombstones: readonly ZineboxComicTombstone[],
): ZineboxComicTombstone[] {
  return normalizePortfolioTombstones(tombstones, MAX_ZINEBOX_COMIC_TOMBSTONES);
}

export function listZineboxComicTombstones(): ZineboxComicTombstone[] {
  return readPersisted();
}

export function recordZineboxComicTombstone(comicId: string, removedAt = new Date().toISOString()): void {
  const id = comicId.trim();
  if (!id) return;
  const next = normalizePortfolioTombstoneList([
    ...readPersisted(),
    { id, removedAt },
  ]);
  writePersisted(next);
}

export function recordZineboxComicTombstones(comicIds: readonly string[]): void {
  const removedAt = new Date().toISOString();
  const next = normalizePortfolioTombstoneList([
    ...readPersisted(),
    ...comicIds.map((id) => ({ id, removedAt })),
  ]);
  writePersisted(next);
}

export function mergeZineboxComicTombstonesFromRemote(
  remote: readonly ZineboxComicTombstone[] | undefined,
): ZineboxComicTombstone[] {
  const merged = mergePortfolioTombstoneLists(readPersisted(), remote ?? [], MAX_ZINEBOX_COMIC_TOMBSTONES);
  writePersisted(merged);
  return merged;
}
