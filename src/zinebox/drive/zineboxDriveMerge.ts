import type { ZineboxCollection, ZineboxComic, ZineboxReadStatus } from '../types';
import type { ZineboxSyncPayload } from './zineboxDriveEnvelope';

export type ZineboxDriveMergeReport = {
  comicsMerged: number;
  comicsFromLocalOnly: number;
  comicsFromRemoteOnly: number;
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

function mergeCollection(local: ZineboxCollection, remote: ZineboxCollection): ZineboxCollection {
  const itemIds = [...new Set([...local.itemIds, ...remote.itemIds])];
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
  options?: { tombstoneComicIds?: ReadonlySet<string> },
): { payload: ZineboxSyncPayload; report: ZineboxDriveMergeReport } {
  const tombstoneComicIds = options?.tombstoneComicIds ?? new Set<string>();
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

  for (const id of comicIds) {
    if (tombstoneComicIds.has(id)) continue;
    const l = localById.get(id);
    const r = remoteById.get(id);
    if (l && r) {
      comics.push(mergeComic(l, r));
      comicsMerged += 1;
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
    const l = localCollections.get(id);
    const r = remoteCollections.get(id);
    if (l && r) {
      collections.push(mergeCollection(l, r));
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
      collectionsMerged,
    },
  };
}

export function formatZineboxDriveMergeReport(report: ZineboxDriveMergeReport): string {
  const parts: string[] = [];
  if (report.comicsFromRemoteOnly > 0) {
    parts.push(
      `added ${report.comicsFromRemoteOnly} comic${report.comicsFromRemoteOnly === 1 ? '' : 's'} from Drive`,
    );
  }
  if (report.comicsMerged > 0) {
    parts.push(`merged ${report.comicsMerged} comic${report.comicsMerged === 1 ? '' : 's'}`);
  }
  if (report.comicsFromLocalOnly > 0) {
    parts.push(`kept ${report.comicsFromLocalOnly} local-only`);
  }
  return parts.length > 0 ? parts.join(', ') : 'already in sync';
}
