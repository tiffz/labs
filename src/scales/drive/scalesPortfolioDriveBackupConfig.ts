import { LABS_DRIVE_APP_FOLDER_SCALES } from '../../shared/drive/labsDrivePortfolioLayout';
import type { LabsPortfolioDriveBackupConfig } from '../../shared/drive/labsPortfolioDriveBackupTypes';
import { subscribeScalesProgressSave } from '../progress/store';
import type { ScalesProgressData } from '../progress/types';
import {
  analyzeScalesConflict,
  assessScalesDriveBackupConflict,
  shouldPromptScalesDriveMerge,
  type ScalesDriveConflictReason,
} from './scalesDriveConflict';
import {
  buildScalesDriveEnvelope,
  parseScalesDriveEnvelope,
  serializeScalesDriveEnvelope,
  type ScalesDriveEnvelopeV1,
} from './scalesDriveEnvelope';
import {
  formatScalesDriveMergeReport,
  mergeScalesProgress,
  type ScalesDriveMergeReport,
} from './scalesDriveMerge';
import { readScalesDriveSyncMeta, writeScalesDriveSyncMeta } from './scalesDriveSyncMeta';
import {
  findLatestScalesPrePullSnapshot,
  formatScalesDriveUndoSnapshotTrigger,
  listScalesDriveUndoSnapshots,
  parseScalesSnapshotEnvelope,
  pushScalesDriveUndoSnapshot,
  type ScalesDriveUndoSnapshot,
} from './scalesDriveUndoSnapshots';
import { ensureScalesGoogleDriveAccess, signInScalesGoogleDrive } from './scalesGoogleDriveAccess';
import { readScalesPortfolioDriveLocalPayload } from './scalesPortfolioDriveProgressHolder';

export type ScalesDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt?: string;
  remoteExerciseCount?: number;
  localExerciseCount?: number;
  reasons: ScalesDriveConflictReason[];
  remoteEnvelope: ScalesDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
  analysis?: import('../../shared/drive/labsPortfolioConflictAnalysis').LabsPortfolioConflictAnalysis;
};

export const scalesPortfolioDriveBackupConfig: LabsPortfolioDriveBackupConfig<
  ScalesDriveEnvelopeV1,
  ScalesProgressData,
  ScalesDriveMergeReport,
  ScalesDriveConflictReason,
  ScalesDriveBackupConflictState,
  ScalesDriveUndoSnapshot
> = {
  appFolderName: LABS_DRIVE_APP_FOLDER_SCALES,
  ensureAccess: (options) => ensureScalesGoogleDriveAccess({ interactive: options.interactive }),
  signIn: signInScalesGoogleDrive,
  readLocalPayload: async () => readScalesPortfolioDriveLocalPayload(),
  buildEnvelope: buildScalesDriveEnvelope,
  serializeEnvelope: serializeScalesDriveEnvelope,
  parseEnvelope: parseScalesDriveEnvelope,
  envelopeToPayload: (envelope) => envelope.payload,
  mergePayload: (local, remote) => {
    const { progress, report } = mergeScalesProgress(local, remote);
    return { payload: progress, report };
  },
  formatMergeReport: formatScalesDriveMergeReport,
  mergeReportHasRemoteChanges: (report) =>
    report.exercisesFromRemoteOnly + report.exercisesMerged > 0,
  shouldPromptMerge: (args) =>
    shouldPromptScalesDriveMerge({
      syncMeta: args.syncMeta,
      cloudModifiedTime: args.cloudModifiedTime,
      remoteEnvelope: args.remoteEnvelope,
      progress: args.local,
    }),
  assessConflict: (args) => {
    const assessment = assessScalesDriveBackupConflict(args);
    return { reasons: assessment.reasons };
  },
  analyzeConflict: ({ syncMeta, local, remoteEnvelope }) =>
    analyzeScalesConflict({ syncMeta, local, remoteEnvelope }),
  buildConflictState: ({ meta, refs, remoteEnvelope, local, reasons, analysis }) => ({
    driveModifiedTime: meta.modifiedTime ?? '',
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteExerciseCount: Object.keys(remoteEnvelope.payload.exercises ?? {}).length,
    localExerciseCount: Object.keys(local.exercises ?? {}).length,
    reasons,
    remoteEnvelope,
    etag: meta.etag,
    progressFileId: refs.progressFileId,
    analysis,
  }),
  readSyncMeta: readScalesDriveSyncMeta,
  writeSyncMeta: writeScalesDriveSyncMeta,
  subscribeLocalChanges: (onChange) =>
    subscribeScalesProgressSave(() => {
      onChange({});
    }),
  messages: {
    emptyPull: 'No Learn Your Scales backup on Drive yet.',
    saved: 'Progress saved to Google Drive.',
    silentPullChanged:
      'Drive backup changed on another device. Open your account menu to choose how to merge.',
    alreadyInSync: 'Already in sync with Drive.',
    silentSyncedPrefix: 'Synced from Drive',
  },
  undo: {
    listSnapshots: listScalesDriveUndoSnapshots,
    pushSnapshot: (envelope, trigger) =>
      pushScalesDriveUndoSnapshot(envelope, trigger as ScalesDriveUndoSnapshot['trigger']),
    findLatestPrePull: findLatestScalesPrePullSnapshot,
    parseSnapshotEnvelope: parseScalesSnapshotEnvelope,
    formatSnapshotTrigger: (trigger) =>
      formatScalesDriveUndoSnapshotTrigger(trigger as ScalesDriveUndoSnapshot['trigger']),
    canRestore: ({ testerOk, latestRemoteEnvelope, lastMeta, undoSnapshots }) =>
      testerOk &&
      (latestRemoteEnvelope != null ||
        Boolean(lastMeta.lastBackupExportedAt) ||
        undoSnapshots.length > 0),
  },
  historyRecovery: {
    entityNoun: 'exercise',
    listEntityIds: (payload) => Object.keys(payload.exercises ?? {}),
    getEntityLabel: (id, payload) => payload.exercises?.[id]?.exerciseId ?? id,
    payloadWithEntity: (source, id) => {
      const exercise = source.exercises?.[id];
      if (!exercise) return null;
      return {
        ...source,
        exercises: { [id]: exercise },
      };
    },
  },
};
