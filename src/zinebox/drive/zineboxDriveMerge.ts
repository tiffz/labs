import type { ZineboxCollection, ZineboxComic, ZineboxReadStatus } from '../types';
import type { ZineboxSyncPayload } from './zineboxDriveEnvelope';
import { stackMembershipTombstoneId } from './zineboxDriveStackTombstones';

export type ZineboxDriveMergeReport = {
  /** Overlap count (diagnostics only — not user-facing). */
  comicsMerged: number;
  comicsFromLocalOnly: number;
  comicsFromRemoteOnly: number;
  /** Comics that existed locally but changed because Drive had newer metadata/progress. */
  comicsUpdatedFromRemote: number;
  collectionsMerged: number;
};

function readStatusRank(status: ZineboxReadStatus): number {
  switch (status) {
    case 'finished':
      return 2;
    case 'in_progress':
      return 1;
    default:
      return 0;
  }
}

function mergeReadStatus(a: ZineboxReadStatus, b: ZineboxReadStatus): ZineboxReadStatus {
  return readStatusRank(a) >= readStatusRank(b) ? a : b;
}

function mergeTags(a: readonly string[] | undefined, b: readonly string[] | undefined): string[] | undefined {
  const merged = [...new Set([...(a ?? []), ...(b ?? [])])];
  return merged.length > 0 ? merged : undefined;
}

function tagsKey(tags: readonly string[] | undefined): string {
  return [...(tags ?? [])].sort().join('\0');
}

/** True when merge applied remote fields the local copy did not already have. */
function comicChangedByMerge(local: ZineboxComic, merged: ZineboxComic): boolean {
  return (
    local.progressPercentage !== merged.progressPercentage ||
    local.readStatus !== merged.readStatus ||
    tagsKey(local.tags) !== tagsKey(merged.tags) ||
    (!local.title.trim() && local.title !== merged.title) ||
    (!local.coverThumbnailBase64 && local.coverThumbnailBase64 !== merged.coverThumbnailBase64) ||
    (local.driveBackupFileId ?? null) !== (merged.driveBackupFileId ?? null) ||
    (local.driveFileId ?? null) !== (merged.driveFileId ?? null) ||
    (local.driveMediaFileId ?? null) !== (merged.driveMediaFileId ?? null) ||
    (local.contentMd5 ?? null) !== (merged.contentMd5 ?? null) ||
    (local.fileSizeBytes ?? null) !== (merged.fileSizeBytes ?? null) ||
    (local.filename ?? null) !== (merged.filename ?? null) ||
    (local.storageKind ?? null) !== (merged.storageKind ?? null)
  );
}

function mergeComic(local: ZineboxComic, remote: ZineboxComic): ZineboxComic {
  const preferLocalTitle = local.title.trim().length > 0;
  return {
    ...remote,
    ...local,
    title: preferLocalTitle ? local.title : remote.title,
    progressPercentage: Math.max(local.progressPercentage, remote.progressPercentage),
    readStatus: mergeReadStatus(local.readStatus, remote.readStatus),
    tags: mergeTags(local.tags, remote.tags),
    coverThumbnailBase64: local.coverThumbnailBase64 || remote.coverThumbnailBase64,
    driveBackupFileId: local.driveBackupFileId ?? remote.driveBackupFileId,
    driveFileId: local.driveFileId ?? remote.driveFileId,
    driveMediaFileId: local.driveMediaFileId ?? remote.driveMediaFileId,
    contentMd5: local.contentMd5 ?? remote.contentMd5,
    fileSizeBytes: local.fileSizeBytes ?? remote.fileSizeBytes,
    filename: local.filename ?? remote.filename,
    storageKind: local.storageKind ?? remote.storageKind,
  };
}

function mergeCollection(
  local: ZineboxCollection,
  remote: ZineboxCollection,
  removedStackMemberships: ReadonlySet<string>,
): ZineboxCollection {
  const stackId = local.id;
  const isRemoved = (comicId: string) =>
    removedStackMemberships.has(stackMembershipTombstoneId(stackId, comicId));
  const itemIds = [...new Set([...local.itemIds, ...remote.itemIds])].filter((id) => !isRemoved(id));
  return {
    id: local.id,
    name: local.name.trim() ? local.name : remote.name,
    itemIds,
    customSortOrder: local.customSortOrder ?? remote.customSortOrder,
  };
}

export function mergeZineboxSyncPayload(
  local: ZineboxSyncPayload,
  remote: ZineboxSyncPayload,
  options?: {
    tombstoneComicIds?: ReadonlySet<string>;
    deletedStackIds?: ReadonlySet<string>;
    removedStackMemberships?: ReadonlySet<string>;
  },
): { payload: ZineboxSyncPayload; report: ZineboxDriveMergeReport } {
  const tombstoneComicIds = options?.tombstoneComicIds ?? new Set<string>();
  const deletedStackIds = options?.deletedStackIds ?? new Set<string>();
  const removedStackMemberships = options?.removedStackMemberships ?? new Set<string>();
  const comicIds = new Set([
    ...local.comics.map((c) => c.id),
    ...remote.comics.map((c) => c.id),
  ]);
  const localById = new Map(local.comics.map((c) => [c.id, c]));
  const remoteById = new Map(remote.comics.map((c) => [c.id, c]));
  const comics: ZineboxComic[] = [];
  let comicsMerged = 0;
  let comicsFromLocalOnly = 0;
  let comicsFromRemoteOnly = 0;
  let comicsUpdatedFromRemote = 0;

  for (const id of comicIds) {
    if (tombstoneComicIds.has(id)) continue;
    const l = localById.get(id);
    const r = remoteById.get(id);
    if (l && r) {
      const mergedComic = mergeComic(l, r);
      comics.push(mergedComic);
      comicsMerged += 1;
      if (comicChangedByMerge(l, mergedComic)) {
        comicsUpdatedFromRemote += 1;
      }
    } else if (l) {
      comics.push(l);
      comicsFromLocalOnly += 1;
    } else if (r) {
      comics.push(r);
      comicsFromRemoteOnly += 1;
    }
  }

  const collectionIds = new Set([
    ...local.collections.map((c) => c.id),
    ...remote.collections.map((c) => c.id),
  ]);
  const localCollections = new Map(local.collections.map((c) => [c.id, c]));
  const remoteCollections = new Map(remote.collections.map((c) => [c.id, c]));
  const collections: ZineboxCollection[] = [];
  let collectionsMerged = 0;

  for (const id of collectionIds) {
    if (deletedStackIds.has(id)) continue;
    const l = localCollections.get(id);
    const r = remoteCollections.get(id);
    if (l && r) {
      collections.push(mergeCollection(l, r, removedStackMemberships));
      collectionsMerged += 1;
    } else if (l) {
      const keptItems = l.itemIds.filter((itemId) => !tombstoneComicIds.has(itemId));
      if (keptItems.length > 0) {
        collections.push({ ...l, itemIds: keptItems });
      }
    } else if (r) {
      const keptItems = r.itemIds.filter((itemId) => !tombstoneComicIds.has(itemId));
      if (keptItems.length > 0) {
        collections.push({ ...r, itemIds: keptItems });
      }
    }
  }

  return {
    payload: { comics, collections },
    report: {
      comicsMerged,
      comicsFromLocalOnly,
      comicsFromRemoteOnly,
      comicsUpdatedFromRemote,
      collectionsMerged,
    },
  };
}

/** Whether a silent auto-pull should toast — only when Drive added or changed something here. */
export function zineboxMergeReportHasUserVisibleRemoteChanges(
  report: ZineboxDriveMergeReport,
): boolean {
  return report.comicsFromRemoteOnly > 0 || report.comicsUpdatedFromRemote > 0;
}

export function formatZineboxDriveMergeReport(report: ZineboxDriveMergeReport): string {
  const parts: string[] = [];
  if (report.comicsFromRemoteOnly > 0) {
    parts.push(
      `added ${report.comicsFromRemoteOnly} comic${report.comicsFromRemoteOnly === 1 ? '' : 's'} from Drive`,
    );
  }
  if (report.comicsUpdatedFromRemote > 0) {
    parts.push(
      `updated ${report.comicsUpdatedFromRemote} comic${report.comicsUpdatedFromRemote === 1 ? '' : 's'} from Drive`,
    );
  }
  if (report.comicsFromLocalOnly > 0) {
    parts.push(`kept ${report.comicsFromLocalOnly} local-only`);
  }
  return parts.length > 0 ? parts.join(', ') : 'already in sync';
}
