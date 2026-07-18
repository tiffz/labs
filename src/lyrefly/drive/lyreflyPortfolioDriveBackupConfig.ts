import { LABS_DRIVE_APP_FOLDER_LYREFLY } from '../../shared/drive/labsDrivePortfolioLayout';
import type { LabsPortfolioDriveBackupConfig } from '../../shared/drive/labsPortfolioDriveBackupTypes';
import { subscribeLyreflyLocalChanges } from '../db/lyreflyChangeBus';
import { lyreflyProjectTombstonesForEnvelope, lyreflyTombstoneProjectIdsFromRemote } from './lyreflyDriveTombstones';
import {
  analyzeLyreflyConflict,
  assessLyreflyDriveBackupConflict,
  shouldPromptLyreflyDriveMerge,
  type LyreflyDriveConflictReason,
} from './lyreflyDriveConflict';
import {
  buildLyreflyDriveEnvelope,
  envelopeToPayload,
  parseLyreflyDriveEnvelope,
  serializeLyreflyDriveEnvelope,
  type LyreflyDriveEnvelopeV1,
  type LyreflySyncPayload,
} from './lyreflyDriveEnvelope';
import {
  formatLyreflyDriveMergeReport,
  lyreflyMergeReportHasUserVisibleRemoteChanges,
  mergeLyreflySyncPayload,
  type LyreflyDriveMergeReport,
} from './lyreflyDriveMerge';
import { readLyreflyDriveSyncMeta, writeLyreflyDriveSyncMeta } from './lyreflyDriveSyncMeta';
import {
  downloadMissingLyreflyProjectSidecars,
  lyreflyNeedsSidecarDownload,
  uploadLyreflyProjectSidecars,
} from './lyreflyProjectPackageDriveSync';
import {
  findLatestLyreflyPrePullSnapshot,
  formatLyreflyDriveUndoSnapshotTrigger,
  listLyreflyDriveUndoSnapshots,
  parseLyreflySnapshotEnvelope,
  pushLyreflyDriveUndoSnapshot,
  type LyreflyDriveUndoSnapshot,
} from './lyreflyDriveUndoSnapshots';
import { ensureLyreflyGoogleDriveAccess, signInLyreflyGoogleDrive } from './lyreflyGoogleDriveAccess';
import { readLyreflyLocalPayload } from './lyreflyLocalData';

export type LyreflyDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt?: string;
  remoteProjectCount?: number;
  localProjectCount?: number;
  reasons: LyreflyDriveConflictReason[];
  remoteEnvelope: LyreflyDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
  analysis?: import('../../shared/drive/labsPortfolioConflictAnalysis').LabsPortfolioConflictAnalysis;
};

export const lyreflyPortfolioDriveBackupConfig: LabsPortfolioDriveBackupConfig<
  LyreflyDriveEnvelopeV1,
  LyreflySyncPayload,
  LyreflyDriveMergeReport,
  LyreflyDriveConflictReason,
  LyreflyDriveBackupConflictState,
  LyreflyDriveUndoSnapshot
> = {
  appFolderName: LABS_DRIVE_APP_FOLDER_LYREFLY,
  ensureAccess: ensureLyreflyGoogleDriveAccess,
  signIn: async () => {
    await signInLyreflyGoogleDrive();
  },
  readLocalPayload: readLyreflyLocalPayload,
  buildEnvelope: (local) =>
    buildLyreflyDriveEnvelope(local, lyreflyProjectTombstonesForEnvelope()),
  serializeEnvelope: serializeLyreflyDriveEnvelope,
  parseEnvelope: parseLyreflyDriveEnvelope,
  envelopeToPayload,
  mergePayload: (local, remote, options) => {
    const remoteEnvelope = options?.remoteEnvelope;
    const tombstoneProjectIds = remoteEnvelope
      ? lyreflyTombstoneProjectIdsFromRemote(remoteEnvelope.deletedProjectIds)
      : undefined;
    const { payload, report } = mergeLyreflySyncPayload(local, remote, { tombstoneProjectIds });
    return { payload, report };
  },
  formatMergeReport: formatLyreflyDriveMergeReport,
  mergeReportHasRemoteChanges: lyreflyMergeReportHasUserVisibleRemoteChanges,
  shouldPromptMerge: shouldPromptLyreflyDriveMerge,
  assessConflict: assessLyreflyDriveBackupConflict,
  analyzeConflict: ({ syncMeta, local, remoteEnvelope }) =>
    analyzeLyreflyConflict({ syncMeta, local, remoteEnvelope }),
  buildConflictState: ({ meta, refs, remoteEnvelope, local, reasons, analysis }) => ({
    driveModifiedTime: meta.modifiedTime ?? '',
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteProjectCount: remoteEnvelope.projects.length,
    localProjectCount: local.projects.length,
    reasons,
    remoteEnvelope,
    etag: meta.etag,
    progressFileId: refs.progressFileId,
    analysis,
  }),
  readSyncMeta: readLyreflyDriveSyncMeta,
  writeSyncMeta: writeLyreflyDriveSyncMeta,
  subscribeLocalChanges: (onChange) =>
    subscribeLyreflyLocalChanges((event) => onChange(event ?? {})),
  uploadSidecars: uploadLyreflyProjectSidecars,
  downloadSidecars: downloadMissingLyreflyProjectSidecars,
  needsSidecarDownload: lyreflyNeedsSidecarDownload,
  messages: {
    emptyPull: 'No Lyrefly backup on Drive yet.',
    saved: 'Projects saved to Google Drive.',
    silentPullChanged:
      'Drive backup changed on another device. Open your account menu to choose how to merge.',
    alreadyInSync: 'Already in sync with Drive.',
    silentSyncedPrefix: 'Synced from Drive',
  },
  undo: {
    listSnapshots: listLyreflyDriveUndoSnapshots,
    pushSnapshot: (envelope, trigger) =>
      pushLyreflyDriveUndoSnapshot(envelope, trigger as LyreflyDriveUndoSnapshot['trigger']),
    findLatestPrePull: findLatestLyreflyPrePullSnapshot,
    parseSnapshotEnvelope: parseLyreflySnapshotEnvelope,
    formatSnapshotTrigger: (trigger) =>
      formatLyreflyDriveUndoSnapshotTrigger(trigger as LyreflyDriveUndoSnapshot['trigger']),
    canRestore: ({ testerOk, latestRemoteEnvelope, lastMeta, undoSnapshots }) =>
      testerOk &&
      (latestRemoteEnvelope != null ||
        Boolean(lastMeta.lastBackupExportedAt) ||
        undoSnapshots.length > 0),
  },
  historyRecovery: {
    entityNoun: 'project',
    listEntityIds: (payload) => payload.projects.map((p) => p.id),
    getEntityLabel: (id, payload) => payload.projects.find((p) => p.id === id)?.title,
    payloadWithEntity: (source, id) => {
      const project = source.projects.find((p) => p.id === id);
      if (!project) return null;
      return { projects: [project] };
    },
  },
};
