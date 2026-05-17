import type { RepertoireExtrasRow } from '../db/encoreDb';
import {
  derivePlaylistImportTagsFromFilters,
  normalizeExcludedRepertoireFieldIds,
  normalizeSavedSearchFilterValues,
} from '../repertoire/repertoireSavedSearchFilter';
import type {
  EncoreDriveUploadFolderKind,
  EncoreDriveUploadFolderOverrideLabels,
  EncoreDriveUploadFolderOverrides,
  EncorePerformance,
  EncoreRepertoireSavedSearch,
  EncoreSong,
  EncoreTableUiBundle,
  RepertoireWirePayload,
} from '../types';

const DRIVE_UPLOAD_FOLDER_KINDS = new Set<EncoreDriveUploadFolderKind>([
  'performances',
  'charts',
  'referenceTracks',
  'backingTracks',
  'takes',
]);

function parseDriveUploadFolderOverrides(raw: unknown): EncoreDriveUploadFolderOverrides | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: EncoreDriveUploadFolderOverrides = {};
  for (const key of DRIVE_UPLOAD_FOLDER_KINDS) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function parseDriveUploadFolderOverrideLabels(raw: unknown): EncoreDriveUploadFolderOverrideLabels | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: EncoreDriveUploadFolderOverrideLabels = {};
  for (const key of DRIVE_UPLOAD_FOLDER_KINDS) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function parseRepertoireSavedSearches(raw: unknown): EncoreRepertoireSavedSearch[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: EncoreRepertoireSavedSearch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    let updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt.trim() : '';
    if (!updatedAt) updatedAt = new Date().toISOString();
    if (!id || !name) continue;
    const searchQuery = typeof o.searchQuery === 'string' ? o.searchQuery : '';
    const visibleFieldIds = Array.isArray(o.visibleFieldIds)
      ? (o.visibleFieldIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const filterValues: Record<string, string[]> = {};
    if (o.filterValues && typeof o.filterValues === 'object' && !Array.isArray(o.filterValues)) {
      for (const [k, v] of Object.entries(o.filterValues as Record<string, unknown>)) {
        if (!k) continue;
        if (Array.isArray(v)) filterValues[k] = v.filter((x): x is string => typeof x === 'string');
      }
    }
    const normalizedFilters = normalizeSavedSearchFilterValues(filterValues);
    const excludedFieldIds = normalizeExcludedRepertoireFieldIds(
      Array.isArray(o.excludedFieldIds)
        ? (o.excludedFieldIds as unknown[]).filter((x): x is string => typeof x === 'string')
        : undefined,
    );
    const spotifyPlaylistId =
      typeof o.spotifyPlaylistId === 'string' ? o.spotifyPlaylistId.trim() || undefined : undefined;
    const tagRaw = o.playlistImportTags;
    let playlistImportTags =
      Array.isArray(tagRaw) && tagRaw.length > 0
        ? tagRaw.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean)
        : undefined;
    if (!playlistImportTags?.length) {
      playlistImportTags = derivePlaylistImportTagsFromFilters(normalizedFilters, excludedFieldIds);
    }
    out.push({
      id,
      name,
      updatedAt,
      searchQuery,
      visibleFieldIds,
      filterValues: normalizedFilters,
      excludedFieldIds: excludedFieldIds.length > 0 ? excludedFieldIds : undefined,
      spotifyPlaylistId,
      playlistImportTags: playlistImportTags?.length ? playlistImportTags : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function defaultRepertoireExtrasRow(iso: string): RepertoireExtrasRow {
  return { id: 'default', venueCatalog: [], milestoneTemplate: [], updatedAt: iso };
}

export function parseRepertoireWire(json: string): RepertoireWirePayload {
  const data = JSON.parse(json) as Partial<RepertoireWirePayload>;
  if (data.version !== 1 || !Array.isArray(data.songs) || !Array.isArray(data.performances)) {
    throw new Error('Invalid repertoire_data.json');
  }
  return {
    version: 1,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    songs: data.songs as EncoreSong[],
    performances: data.performances as EncorePerformance[],
    venueCatalog: Array.isArray(data.venueCatalog) ? data.venueCatalog : undefined,
    milestoneTemplate: Array.isArray(data.milestoneTemplate) ? data.milestoneTemplate : undefined,
    ownerDisplayName: typeof data.ownerDisplayName === 'string' ? data.ownerDisplayName : undefined,
    currentlyLearningSpotifyPlaylistId:
      typeof data.currentlyLearningSpotifyPlaylistId === 'string'
        ? data.currentlyLearningSpotifyPlaylistId.trim() || undefined
        : undefined,
    lastSyncedLearningPlaylistTrackIds: Array.isArray(data.lastSyncedLearningPlaylistTrackIds)
      ? (data.lastSyncedLearningPlaylistTrackIds as unknown[])
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      : undefined,
    repertoireSpotifySyncPerformedOnly:
      typeof data.repertoireSpotifySyncPerformedOnly === 'boolean'
        ? data.repertoireSpotifySyncPerformedOnly
        : undefined,
    repertoireSavedSearches: parseRepertoireSavedSearches(data.repertoireSavedSearches),
    tableUi: parseTableUiBundle(data.tableUi),
    driveUploadFolderOverrides: parseDriveUploadFolderOverrides(data.driveUploadFolderOverrides),
    driveUploadFolderOverrideLabels: parseDriveUploadFolderOverrideLabels(data.driveUploadFolderOverrideLabels),
  };
}

function parseTableUiBundle(raw: unknown): EncoreTableUiBundle | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const repertoire = parseMrtPrefs(o.repertoire);
  const performances = parseMrtPrefs(o.performances);
  if (!repertoire && !performances) return undefined;
  return { repertoire, performances };
}

function parseMrtPrefs(raw: unknown): EncoreTableUiBundle['repertoire'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const columnVisibility =
    o.columnVisibility && typeof o.columnVisibility === 'object' && !Array.isArray(o.columnVisibility)
      ? (o.columnVisibility as Record<string, boolean>)
      : undefined;
  const columnOrder = Array.isArray(o.columnOrder)
    ? (o.columnOrder as string[]).filter((x) => typeof x === 'string')
    : undefined;
  const sorting = Array.isArray(o.sorting)
    ? (o.sorting as unknown[])
        .filter(
          (s): s is { id: string; desc: boolean } =>
            Boolean(s) &&
            typeof s === 'object' &&
            typeof (s as { id?: unknown }).id === 'string' &&
            typeof (s as { desc?: unknown }).desc === 'boolean',
        )
    : undefined;
  if (!columnVisibility && !columnOrder?.length && !sorting?.length) return undefined;
  return { columnVisibility, columnOrder, sorting };
}

export function serializeRepertoireWire(payload: RepertoireWirePayload): string {
  return JSON.stringify(payload, null, 0);
}

export function buildWireFromTables(
  songs: EncoreSong[],
  performances: EncorePerformance[],
  extras: RepertoireExtrasRow,
): RepertoireWirePayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    performances,
    venueCatalog: extras.venueCatalog,
    milestoneTemplate: extras.milestoneTemplate,
    ownerDisplayName: extras.ownerDisplayName,
    currentlyLearningSpotifyPlaylistId: extras.currentlyLearningSpotifyPlaylistId,
    lastSyncedLearningPlaylistTrackIds: extras.lastSyncedLearningPlaylistTrackIds,
    repertoireSpotifySyncPerformedOnly: extras.repertoireSpotifySyncPerformedOnly,
    repertoireSavedSearches: extras.repertoireSavedSearches,
    tableUi: extras.tableUi,
    driveUploadFolderOverrides: extras.driveUploadFolderOverrides,
    driveUploadFolderOverrideLabels: extras.driveUploadFolderOverrideLabels,
  };
}

/** Derive `repertoireExtras` row from a parsed wire payload (used after pull). */
export function repertoireExtrasFromWire(wire: RepertoireWirePayload): RepertoireExtrasRow {
  const fromPerformances = [...new Set(wire.performances.map((p) => p.venueTag.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const venueCatalog =
    wire.venueCatalog && wire.venueCatalog.length > 0
      ? [...wire.venueCatalog]
      : fromPerformances;
  return {
    id: 'default',
    venueCatalog,
    milestoneTemplate: wire.milestoneTemplate ?? [],
    ownerDisplayName: wire.ownerDisplayName?.trim() || undefined,
    currentlyLearningSpotifyPlaylistId: wire.currentlyLearningSpotifyPlaylistId?.trim() || undefined,
    lastSyncedLearningPlaylistTrackIds:
      wire.lastSyncedLearningPlaylistTrackIds && wire.lastSyncedLearningPlaylistTrackIds.length > 0
        ? [...wire.lastSyncedLearningPlaylistTrackIds]
        : undefined,
    repertoireSpotifySyncPerformedOnly:
      typeof wire.repertoireSpotifySyncPerformedOnly === 'boolean'
        ? wire.repertoireSpotifySyncPerformedOnly
        : undefined,
    repertoireSavedSearches: wire.repertoireSavedSearches,
    tableUi: wire.tableUi,
    driveUploadFolderOverrides: wire.driveUploadFolderOverrides,
    driveUploadFolderOverrideLabels: wire.driveUploadFolderOverrideLabels,
    updatedAt: wire.exportedAt,
  };
}

export function maxUpdatedAt(songs: EncoreSong[], performances: EncorePerformance[]): string {
  let max = '';
  for (const s of songs) {
    if (s.updatedAt > max) max = s.updatedAt;
  }
  for (const p of performances) {
    if (p.updatedAt > max) max = p.updatedAt;
  }
  return max;
}

/** Include repertoire extras clock so venue/milestone-only edits trigger sync. */
export function maxRepertoireClock(songs: EncoreSong[], performances: EncorePerformance[], extrasUpdatedAt?: string): string {
  const base = maxUpdatedAt(songs, performances);
  if (extrasUpdatedAt && extrasUpdatedAt > base) return extrasUpdatedAt;
  return base;
}

/** Merge remote records into local by id using latest `updatedAt`. */
export function mergeRecordsByUpdatedAt<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const r of local) {
    byId.set(r.id, r);
  }
  for (const r of remote) {
    const cur = byId.get(r.id);
    if (!cur || r.updatedAt > cur.updatedAt) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
