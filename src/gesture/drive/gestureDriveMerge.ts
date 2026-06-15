import type { GestureDrawRecord, GesturePack, GesturePackFile, GestureSyncPayload } from '../types';
import { stripEphemeralUploadFields } from './gestureUploadEphemeral';

export type GestureDriveMergeReport = {
  packsMerged: number;
  packsFromRemoteOnly: number;
  packFilesMerged: number;
  packFilesFromRemoteOnly: number;
  historyMerged: number;
  historyFromRemoteOnly: number;
};

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
  };
}

function mergePackFiles(
  local: GesturePackFile[],
  remote: GesturePackFile[],
  mergedPacks: GesturePack[],
  remotePacks: GesturePack[],
): { rows: GesturePackFile[]; merged: number; fromRemoteOnly: number } {
  const folderToMergedId = new Map(mergedPacks.map((p) => [p.driveFolderId, p.id]));
  const remotePackIdToFolder = new Map(remotePacks.map((p) => [p.id, p.driveFolderId]));
  const mergedPackIds = new Set(mergedPacks.map((p) => p.id));

  const byFileId = new Map<string, GesturePackFile>();
  let merged = 0;
  let fromRemoteOnly = 0;

  for (const file of local) {
    if (!mergedPackIds.has(file.packId)) continue;
    byFileId.set(file.driveFileId, file);
  }

  for (const file of remote) {
    const folderId = remotePackIdToFolder.get(file.packId);
    if (!folderId) continue;
    const mergedPackId = folderToMergedId.get(folderId);
    if (!mergedPackId) continue;
    const row = { ...file, packId: mergedPackId };
    const existing = byFileId.get(row.driveFileId);
    if (existing) {
      const keepRemote = (row.modifiedTime ?? '') >= (existing.modifiedTime ?? '');
      byFileId.set(row.driveFileId, keepRemote ? row : existing);
      merged += 1;
    } else {
      byFileId.set(row.driveFileId, row);
      fromRemoteOnly += 1;
    }
  }

  return { rows: [...byFileId.values()], merged, fromRemoteOnly };
}

export function mergeGestureSyncPayload(
  local: GestureSyncPayload,
  remote: GestureSyncPayload | null,
): { payload: GestureSyncPayload; report: GestureDriveMergeReport } {
  if (!remote) {
    return {
      payload: local,
      report: {
        packsMerged: 0,
        packsFromRemoteOnly: 0,
        packFilesMerged: 0,
        packFilesFromRemoteOnly: 0,
        historyMerged: 0,
        historyFromRemoteOnly: 0,
      },
    };
  }

  const packByFolder = new Map<string, GesturePack>();
  for (const p of local.packs) packByFolder.set(p.driveFolderId, p);
  let packsMerged = 0;
  let packsFromRemoteOnly = 0;
  for (const remotePack of remote.packs) {
    const localPack = packByFolder.get(remotePack.driveFolderId);
    if (localPack) {
      packByFolder.set(remotePack.driveFolderId, mergePack(localPack, remotePack));
      packsMerged += 1;
    } else {
      packByFolder.set(remotePack.driveFolderId, stripEphemeralUploadFields(remotePack));
      packsFromRemoteOnly += 1;
    }
  }
  const mergedPacks = [...packByFolder.values()];

  const packFileMerge = mergePackFiles(local.packFiles, remote.packFiles, mergedPacks, remote.packs);

  const historyByFile = new Map<string, GestureDrawRecord>();
  for (const h of local.drawHistory) historyByFile.set(h.driveFileId, h);
  let historyMerged = 0;
  let historyFromRemoteOnly = 0;
  for (const remoteRow of remote.drawHistory) {
    const localRow = historyByFile.get(remoteRow.driveFileId);
    if (localRow) {
      historyByFile.set(remoteRow.driveFileId, mergeDrawRecord(localRow, remoteRow));
      historyMerged += 1;
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
      packFilesMerged: packFileMerge.merged,
      packFilesFromRemoteOnly: packFileMerge.fromRemoteOnly,
      historyMerged,
      historyFromRemoteOnly,
    },
  };
}

export function formatGestureDriveMergeReport(report: GestureDriveMergeReport): string {
  const parts: string[] = [];
  if (report.packsFromRemoteOnly > 0) {
    parts.push(`added ${report.packsFromRemoteOnly} pack${report.packsFromRemoteOnly === 1 ? '' : 's'} from Drive`);
  }
  if (report.packFilesFromRemoteOnly > 0) {
    parts.push(
      `added ${report.packFilesFromRemoteOnly} photo index row${report.packFilesFromRemoteOnly === 1 ? '' : 's'}`,
    );
  }
  if (report.historyFromRemoteOnly > 0) {
    parts.push(`added ${report.historyFromRemoteOnly} drawn photo${report.historyFromRemoteOnly === 1 ? '' : 's'}`);
  }
  if (
    report.packsMerged > 0 ||
    report.packFilesMerged > 0 ||
    report.historyMerged > 0
  ) {
    parts.push('merged overlapping progress');
  }
  return parts.length > 0 ? parts.join(', ') : 'already in sync';
}
