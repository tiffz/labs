import type { GestureDrawRecord, GesturePack, GesturePackFile, GestureSyncPayload } from '../types';
import { stripEphemeralUploadFields } from './gestureUploadEphemeral';

export type GestureDriveMergeOptions = {
  tombstonedFolderIds?: ReadonlySet<string>;
  tombstonedFileIds?: ReadonlySet<string>;
};

export type GestureDriveMergeReport = {
  /** Overlap counts (diagnostics only — not user-facing). */
  packsMerged: number;
  packsFromRemoteOnly: number;
  packsSkippedTombstone: number;
  /** Packs that existed locally but changed because Drive had newer metadata. */
  packsUpdatedFromRemote: number;
  packFilesMerged: number;
  packFilesFromRemoteOnly: number;
  packFilesSkippedTombstone: number;
  packFilesUpdatedFromRemote: number;
  historyMerged: number;
  historyFromRemoteOnly: number;
  historySkippedTombstone: number;
  historyUpdatedFromRemote: number;
};

function tagsKey(tags: readonly string[] | undefined): string {
  return [...(tags ?? [])].sort().join('\0');
}

function packChangedByMerge(local: GesturePack, merged: GesturePack): boolean {
  return (
    local.name !== merged.name ||
    local.lastIndexedAt !== merged.lastIndexedAt ||
    local.linkedAt !== merged.linkedAt ||
    (local.source ?? null) !== (merged.source ?? null) ||
    (local.sourceUrl ?? null) !== (merged.sourceUrl ?? null) ||
    (local.subject ?? null) !== (merged.subject ?? null) ||
    (local.notes ?? null) !== (merged.notes ?? null) ||
    tagsKey(local.tags) !== tagsKey(merged.tags) ||
    (local.photoIndexCount ?? 0) !== (merged.photoIndexCount ?? 0) ||
    tagsKey(local.coverFileIds) !== tagsKey(merged.coverFileIds)
  );
}

function packFileChangedByMerge(local: GesturePackFile, merged: GesturePackFile): boolean {
  return (
    local.packId !== merged.packId ||
    local.name !== merged.name ||
    (local.mimeType ?? null) !== (merged.mimeType ?? null) ||
    (local.modifiedTime ?? null) !== (merged.modifiedTime ?? null)
  );
}

function historyChangedByMerge(local: GestureDrawRecord, merged: GestureDrawRecord): boolean {
  return (
    local.totalMs !== merged.totalMs ||
    local.sessionCount !== merged.sessionCount ||
    local.firstDrawnAt !== merged.firstDrawnAt ||
    local.lastDrawnAt !== merged.lastDrawnAt ||
    local.packId !== merged.packId
  );
}

function mergeDrawRecord(local: GestureDrawRecord, remote: GestureDrawRecord): GestureDrawRecord {
  return {
    driveFileId: local.driveFileId,
    packId: local.packId || remote.packId,
    firstDrawnAt: local.firstDrawnAt <= remote.firstDrawnAt ? local.firstDrawnAt : remote.firstDrawnAt,
    lastDrawnAt: local.lastDrawnAt >= remote.lastDrawnAt ? local.lastDrawnAt : remote.lastDrawnAt,
    totalMs: local.totalMs + remote.totalMs,
    sessionCount: local.sessionCount + remote.sessionCount,
  };
}

function mergePack(local: GesturePack, remote: GesturePack): GesturePack {
  const newerIsRemote = remote.lastIndexedAt >= local.lastIndexedAt;
  const pickMeta = <T>(localVal: T | undefined, remoteVal: T | undefined): T | undefined => {
    if (localVal && remoteVal) return newerIsRemote ? remoteVal : localVal;
    return localVal ?? remoteVal;
  };
  const mergeTags = (a?: string[], b?: string[]): string[] | undefined => {
    const merged = [...new Set([...(a ?? []), ...(b ?? [])])];
    return merged.length ? merged : undefined;
  };
  const photoIndexCount = Math.max(local.photoIndexCount ?? 0, remote.photoIndexCount ?? 0);
  const coverFileIds =
    (newerIsRemote ? remote.coverFileIds : local.coverFileIds) ??
    local.coverFileIds ??
    remote.coverFileIds;
  return {
    ...local,
    name: newerIsRemote ? remote.name : local.name,
    linkedAt: local.linkedAt <= remote.linkedAt ? local.linkedAt : remote.linkedAt,
    lastIndexedAt: local.lastIndexedAt >= remote.lastIndexedAt ? local.lastIndexedAt : remote.lastIndexedAt,
    source: pickMeta(local.source, remote.source),
    sourceUrl: pickMeta(local.sourceUrl, remote.sourceUrl),
    subject: pickMeta(local.subject, remote.subject),
    notes: pickMeta(local.notes, remote.notes),
    tags: mergeTags(local.tags, remote.tags),
    ...(photoIndexCount > 0 ? { photoIndexCount } : {}),
    ...(coverFileIds?.length ? { coverFileIds } : {}),
  };
}

function mergePackFiles(
  local: GesturePackFile[],
  localPacks: GesturePack[],
  remote: GesturePackFile[],
  mergedPacks: GesturePack[],
  remotePacks: GesturePack[],
  tombstonedFileIds: ReadonlySet<string>,
): { rows: GesturePackFile[]; merged: number; fromRemoteOnly: number; skippedTombstone: number; updatedFromRemote: number } {
  const folderToMergedId = new Map(mergedPacks.map((p) => [p.driveFolderId, p.id]));
  const localPackIdToFolder = new Map(localPacks.map((p) => [p.id, p.driveFolderId]));
  const remotePackIdToFolder = new Map(remotePacks.map((p) => [p.id, p.driveFolderId]));
  const mergedPackIds = new Set(mergedPacks.map((p) => p.id));

  const byFileId = new Map<string, GesturePackFile>();
  let merged = 0;
  let fromRemoteOnly = 0;
  let skippedTombstone = 0;
  let updatedFromRemote = 0;

  for (const file of local) {
    if (tombstonedFileIds.has(file.driveFileId)) {
      skippedTombstone += 1;
      continue;
    }
    let packId = file.packId;
    if (!mergedPackIds.has(packId)) {
      const folderId = localPackIdToFolder.get(packId);
      const mergedPackId = folderId ? folderToMergedId.get(folderId) : undefined;
      if (!mergedPackId) continue;
      packId = mergedPackId;
    }
    byFileId.set(file.driveFileId, packId === file.packId ? file : { ...file, packId });
  }

  for (const file of remote) {
    if (tombstonedFileIds.has(file.driveFileId)) {
      skippedTombstone += 1;
      continue;
    }
    const folderId = remotePackIdToFolder.get(file.packId);
    if (!folderId) continue;
    const mergedPackId = folderToMergedId.get(folderId);
    if (!mergedPackId) continue;
    const row = { ...file, packId: mergedPackId };
    const existing = byFileId.get(row.driveFileId);
    if (existing) {
      const keepRemote = (row.modifiedTime ?? '') >= (existing.modifiedTime ?? '');
      const next = keepRemote ? row : existing;
      byFileId.set(row.driveFileId, next);
      if (packFileChangedByMerge(existing, next) && keepRemote) {
        updatedFromRemote += 1;
      }
      merged += 1;
    } else {
      byFileId.set(row.driveFileId, row);
      fromRemoteOnly += 1;
    }
  }

  return { rows: [...byFileId.values()], merged, fromRemoteOnly, skippedTombstone, updatedFromRemote };
}

export function mergeGestureSyncPayload(
  local: GestureSyncPayload,
  remote: GestureSyncPayload | null,
  options?: GestureDriveMergeOptions,
): { payload: GestureSyncPayload; report: GestureDriveMergeReport } {
  const tombstonedFolderIds = options?.tombstonedFolderIds ?? new Set<string>();
  const tombstonedFileIds = options?.tombstonedFileIds ?? new Set<string>();

  if (!remote) {
    const packs = local.packs.filter((p) => !tombstonedFolderIds.has(p.driveFolderId));
    const validPackIds = new Set(packs.map((p) => p.id));
    const packFiles = local.packFiles.filter(
      (f) => validPackIds.has(f.packId) && !tombstonedFileIds.has(f.driveFileId),
    );
    const drawHistory = local.drawHistory.filter((h) => !tombstonedFileIds.has(h.driveFileId));
    return {
      payload: { packs, packFiles, drawHistory },
      report: {
        packsMerged: 0,
        packsFromRemoteOnly: 0,
        packsSkippedTombstone: local.packs.length - packs.length,
        packFilesMerged: 0,
        packFilesFromRemoteOnly: 0,
        packFilesSkippedTombstone: local.packFiles.length - packFiles.length,
        packFilesUpdatedFromRemote: 0,
        historyMerged: 0,
        historyFromRemoteOnly: 0,
        historySkippedTombstone: local.drawHistory.length - drawHistory.length,
        historyUpdatedFromRemote: 0,
        packsUpdatedFromRemote: 0,
      },
    };
  }

  const packByFolder = new Map<string, GesturePack>();
  let packsSkippedTombstone = 0;
  for (const p of local.packs) {
    if (tombstonedFolderIds.has(p.driveFolderId)) {
      packsSkippedTombstone += 1;
      continue;
    }
    packByFolder.set(p.driveFolderId, p);
  }
  let packsMerged = 0;
  let packsFromRemoteOnly = 0;
  let packsUpdatedFromRemote = 0;
  for (const remotePack of remote.packs) {
    if (tombstonedFolderIds.has(remotePack.driveFolderId)) {
      packsSkippedTombstone += 1;
      continue;
    }
    const localPack = packByFolder.get(remotePack.driveFolderId);
    if (localPack) {
      const mergedPack = mergePack(localPack, remotePack);
      packByFolder.set(remotePack.driveFolderId, mergedPack);
      packsMerged += 1;
      if (packChangedByMerge(localPack, mergedPack)) {
        packsUpdatedFromRemote += 1;
      }
    } else {
      packByFolder.set(remotePack.driveFolderId, stripEphemeralUploadFields(remotePack));
      packsFromRemoteOnly += 1;
    }
  }
  const mergedPacks = [...packByFolder.values()];

  const packFileMerge = mergePackFiles(
    local.packFiles,
    local.packs,
    remote.packFiles,
    mergedPacks,
    remote.packs,
    tombstonedFileIds,
  );

  const historyByFile = new Map<string, GestureDrawRecord>();
  let historySkippedTombstone = 0;
  for (const h of local.drawHistory) {
    if (tombstonedFileIds.has(h.driveFileId)) {
      historySkippedTombstone += 1;
      continue;
    }
    historyByFile.set(h.driveFileId, h);
  }
  let historyMerged = 0;
  let historyFromRemoteOnly = 0;
  let historyUpdatedFromRemote = 0;
  for (const remoteRow of remote.drawHistory) {
    if (tombstonedFileIds.has(remoteRow.driveFileId)) {
      historySkippedTombstone += 1;
      continue;
    }
    const localRow = historyByFile.get(remoteRow.driveFileId);
    if (localRow) {
      const mergedRow = mergeDrawRecord(localRow, remoteRow);
      historyByFile.set(remoteRow.driveFileId, mergedRow);
      historyMerged += 1;
      if (historyChangedByMerge(localRow, mergedRow)) {
        historyUpdatedFromRemote += 1;
      }
    } else {
      historyByFile.set(remoteRow.driveFileId, remoteRow);
      historyFromRemoteOnly += 1;
    }
  }

  return {
    payload: {
      packs: mergedPacks,
      packFiles: packFileMerge.rows,
      drawHistory: [...historyByFile.values()],
    },
    report: {
      packsMerged,
      packsFromRemoteOnly,
      packsSkippedTombstone,
      packsUpdatedFromRemote,
      packFilesMerged: packFileMerge.merged,
      packFilesFromRemoteOnly: packFileMerge.fromRemoteOnly,
      packFilesSkippedTombstone: packFileMerge.skippedTombstone,
      packFilesUpdatedFromRemote: packFileMerge.updatedFromRemote,
      historyMerged,
      historyFromRemoteOnly,
      historySkippedTombstone,
      historyUpdatedFromRemote,
    },
  };
}

/** Whether a silent auto-pull should toast — only when Drive added or changed something here. */
export function gestureMergeReportHasUserVisibleRemoteChanges(
  report: GestureDriveMergeReport,
): boolean {
  return (
    report.packsFromRemoteOnly > 0 ||
    report.packFilesFromRemoteOnly > 0 ||
    report.historyFromRemoteOnly > 0 ||
    report.packsUpdatedFromRemote > 0 ||
    report.packFilesUpdatedFromRemote > 0 ||
    report.historyUpdatedFromRemote > 0
  );
}

export function formatGestureDriveMergeReport(report: GestureDriveMergeReport): string {
  const parts: string[] = [];
  if (report.packsFromRemoteOnly > 0) {
    parts.push(`added ${report.packsFromRemoteOnly} pack${report.packsFromRemoteOnly === 1 ? '' : 's'} from Drive`);
  }
  if (report.packsUpdatedFromRemote > 0) {
    parts.push(
      `updated ${report.packsUpdatedFromRemote} pack${report.packsUpdatedFromRemote === 1 ? '' : 's'} from Drive`,
    );
  }
  if (report.packFilesFromRemoteOnly > 0) {
    parts.push(
      `added ${report.packFilesFromRemoteOnly} photo index row${report.packFilesFromRemoteOnly === 1 ? '' : 's'}`,
    );
  }
  if (report.packFilesUpdatedFromRemote > 0) {
    parts.push(
      `updated ${report.packFilesUpdatedFromRemote} photo index row${report.packFilesUpdatedFromRemote === 1 ? '' : 's'} from Drive`,
    );
  }
  if (report.historyFromRemoteOnly > 0) {
    parts.push(`added ${report.historyFromRemoteOnly} drawn photo${report.historyFromRemoteOnly === 1 ? '' : 's'}`);
  }
  if (report.historyUpdatedFromRemote > 0) {
    parts.push(
      `updated ${report.historyUpdatedFromRemote} drawn photo${report.historyUpdatedFromRemote === 1 ? '' : 's'} from Drive`,
    );
  }
  return parts.length > 0 ? parts.join(', ') : 'already in sync';
}
