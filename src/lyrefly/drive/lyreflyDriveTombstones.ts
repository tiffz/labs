import {
  mergePortfolioTombstoneLists,
  normalizePortfolioTombstones,
  type LabsPortfolioTombstone,
} from '../../shared/drive/labsPortfolioDriveTombstones';

const STORAGE_KEY = 'lyrefly_drive_project_tombstones_v1';

export const MAX_LYREFLY_PROJECT_TOMBSTONES = 500;

export const LYREFLY_DRIVE_PROJECT_TOMBSTONES_CHANGED_EVENT =
  'lyrefly_drive_project_tombstones_changed';

export type LyreflyProjectTombstone = LabsPortfolioTombstone;

interface PersistedShape {
  schemaVersion: 1;
  tombstones: LyreflyProjectTombstone[];
}

function emitChanged(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(LYREFLY_DRIVE_PROJECT_TOMBSTONES_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function writePersisted(tombstones: LyreflyProjectTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = { schemaVersion: 1, tombstones };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    emitChanged();
  } catch {
    /* quota */
  }
}

function readPersisted(): LyreflyProjectTombstone[] {
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
  tombstones: readonly LyreflyProjectTombstone[],
): LyreflyProjectTombstone[] {
  return normalizePortfolioTombstones(tombstones, MAX_LYREFLY_PROJECT_TOMBSTONES);
}

export function listLyreflyProjectTombstones(): LyreflyProjectTombstone[] {
  return readPersisted();
}

export function recordLyreflyProjectTombstone(projectId: string, removedAt = new Date().toISOString()): void {
  const id = projectId.trim();
  if (!id) return;
  const next = normalizePortfolioTombstoneList([...readPersisted(), { id, removedAt }]);
  writePersisted(next);
}

export function lyreflyProjectTombstonesForEnvelope(): LyreflyProjectTombstone[] {
  return readPersisted();
}

export function lyreflyTombstoneProjectIdsFromRemote(
  remote: readonly LyreflyProjectTombstone[] | undefined,
): Set<string> {
  return new Set((remote ?? []).map((t) => t.id));
}

export function mergeLyreflyProjectTombstonesFromRemote(
  remote: readonly LyreflyProjectTombstone[] | undefined,
): LyreflyProjectTombstone[] {
  const merged = mergePortfolioTombstoneLists(
    readPersisted(),
    remote ?? [],
    MAX_LYREFLY_PROJECT_TOMBSTONES,
  );
  writePersisted(merged);
  return merged;
}
