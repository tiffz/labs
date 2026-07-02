import { LABS_DRIVE_APP_FOLDER_ZINEBOX } from '../../shared/drive/labsDrivePortfolioLayout';
import type { LabsPortfolioDriveBackupConfig } from '../../shared/drive/labsPortfolioDriveBackupTypes';
import { subscribeZineboxLocalChanges } from '../db/zineboxChangeBus';
import {
  zineboxComicTombstonesForEnvelope,
  zineboxTombstoneComicIdsFromRemote,
} from './deleteZineboxComic';
import {
  zineboxDeletedStackTombstonesForEnvelope,
  zineboxDeletedStackIdsFromRemote,
  zineboxRemovedStackMembershipIdsFromRemote,
  zineboxStackMembershipRemovalTombstonesForEnvelope,
} from './zineboxDriveStackTombstones';
import {
  assessZineboxDriveBackupConflict,
  shouldPromptZineboxDriveMerge,
  type ZineboxDriveConflictReason,
} from './zineboxDriveConflict';
import {
  buildZineboxDriveEnvelope,
  envelopeToPayload,
  parseZineboxDriveEnvelope,
  serializeZineboxDriveEnvelope,
  type ZineboxDriveEnvelopeV1,
  type ZineboxSyncPayload,
} from './zineboxDriveEnvelope';
import {
  formatZineboxDriveMergeReport,
  mergeZineboxSyncPayload,
  zineboxMergeReportHasUserVisibleRemoteChanges,
  type ZineboxDriveMergeReport,
} from './zineboxDriveMerge';
import { downloadMissingZineboxPdfs, uploadZineboxPdfsForBackup } from './zineboxDrivePdfSync';
import { readZineboxDriveSyncMeta, writeZineboxDriveSyncMeta } from './zineboxDriveSyncMeta';
import {
  findLatestZineboxPrePullSnapshot,
  formatZineboxDriveUndoSnapshotTrigger,
  listZineboxDriveUndoSnapshots,
  parseZineboxSnapshotEnvelope,
  pushZineboxDriveUndoSnapshot,
  type ZineboxDriveUndoSnapshot,
} from './zineboxDriveUndoSnapshots';
import { ensureZineboxGoogleDriveAccess, signInZineboxGoogleDrive } from './zineboxGoogleDriveAccess';
import { readZineboxLocalPayload } from './zineboxLocalData';

export type ZineboxDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteComicCount: number;
  localComicCount: number;
  reasons: ZineboxDriveConflictReason[];
  remoteEnvelope: ZineboxDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

export const zineboxPortfolioDriveBackupConfig: LabsPortfolioDriveBackupConfig<
  ZineboxDriveEnvelopeV1,
  ZineboxSyncPayload,
  ZineboxDriveMergeReport,
  ZineboxDriveConflictReason,
  ZineboxDriveBackupConflictState,
  ZineboxDriveUndoSnapshot
> = {
  appFolderName: LABS_DRIVE_APP_FOLDER_ZINEBOX,
  ensureAccess: ensureZineboxGoogleDriveAccess,
  signIn: async () => {
    await signInZineboxGoogleDrive();
  },
  readLocalPayload: readZineboxLocalPayload,
  buildEnvelope: (local) =>
    buildZineboxDriveEnvelope(local, zineboxComicTombstonesForEnvelope(), {
      deletedStackIds: zineboxDeletedStackTombstonesForEnvelope(),
      removedStackMemberships: zineboxStackMembershipRemovalTombstonesForEnvelope(),
    }),
  serializeEnvelope: serializeZineboxDriveEnvelope,
  parseEnvelope: parseZineboxDriveEnvelope,
  envelopeToPayload,
  mergePayload: (local, remote, options) => {
    const remoteEnvelope = options?.remoteEnvelope;
    const tombstoneComicIds = remoteEnvelope
      ? zineboxTombstoneComicIdsFromRemote(remoteEnvelope.deletedComicIds)
      : undefined;
    const deletedStackIds = remoteEnvelope
      ? zineboxDeletedStackIdsFromRemote(remoteEnvelope.deletedStackIds)
      : undefined;
    const removedStackMemberships = remoteEnvelope
      ? zineboxRemovedStackMembershipIdsFromRemote(remoteEnvelope.removedStackMemberships)
      : undefined;
    return mergeZineboxSyncPayload(local, remote, {
      tombstoneComicIds,
      deletedStackIds,
      removedStackMemberships,
    });
  },
  formatMergeReport: formatZineboxDriveMergeReport,
  mergeReportHasRemoteChanges: zineboxMergeReportHasUserVisibleRemoteChanges,
  shouldPromptMerge: shouldPromptZineboxDriveMerge,
  assessConflict: assessZineboxDriveBackupConflict,
  buildConflictState: ({ meta, refs, remoteEnvelope, local, reasons }) => ({
    driveModifiedTime: meta.modifiedTime ?? '',
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteComicCount: remoteEnvelope.comics.length,
    localComicCount: local.comics.length,
    reasons,
    remoteEnvelope,
    etag: meta.etag,
    progressFileId: refs.progressFileId,
  }),
  readSyncMeta: readZineboxDriveSyncMeta,
  writeSyncMeta: writeZineboxDriveSyncMeta,
  subscribeLocalChanges: (onChange) =>
    subscribeZineboxLocalChanges((event) => onChange(event ?? {})),
  uploadSidecars: (token, appFolderId, local, onLabel) =>
    uploadZineboxPdfsForBackup(token, appFolderId, local.comics, onLabel),
  downloadSidecars: (token, merged, onProgress) =>
    downloadMissingZineboxPdfs(token, merged.comics, onProgress),
  needsSidecarDownload: (merged) => merged.comics.some((c) => Boolean(c.driveBackupFileId)),
  messages: {
    emptyPull: 'No Zine Box backup on Drive yet.',
    saved: 'Library saved to Google Drive.',
    silentPullChanged:
      'Drive backup changed on another device. Open your account menu to choose how to merge.',
    alreadyInSync: 'Already in sync with Drive.',
    silentSyncedPrefix: 'Synced from Drive',
  },
  undo: {
    listSnapshots: listZineboxDriveUndoSnapshots,
    pushSnapshot: (envelope, trigger) =>
      pushZineboxDriveUndoSnapshot(envelope, trigger as ZineboxDriveUndoSnapshot['trigger']),
    findLatestPrePull: findLatestZineboxPrePullSnapshot,
    parseSnapshotEnvelope: parseZineboxSnapshotEnvelope,
    formatSnapshotTrigger: (trigger) =>
      formatZineboxDriveUndoSnapshotTrigger(trigger as ZineboxDriveUndoSnapshot['trigger']),
    canRestore: ({ testerOk, latestRemoteEnvelope, lastMeta, undoSnapshots }) =>
      testerOk &&
      (latestRemoteEnvelope != null ||
        Boolean(lastMeta.lastBackupExportedAt) ||
        undoSnapshots.length > 0),
  },
  historyRecovery: {
    entityNoun: 'comic',
    listEntityIds: (payload) => payload.comics.map((c) => c.id),
    getEntityLabel: (id, payload) => payload.comics.find((c) => c.id === id)?.title,
    payloadWithEntity: (source, id) => {
      const comic = source.comics.find((c) => c.id === id);
      if (!comic) return null;
      const collections = source.collections.filter((stack) => stack.itemIds.includes(id));
      return { comics: [comic], collections };
    },
  },
};
