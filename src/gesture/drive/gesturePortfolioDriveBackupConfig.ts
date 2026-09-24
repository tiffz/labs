import { LABS_DRIVE_APP_FOLDER_GESTURE } from '../../shared/drive/labsDrivePortfolioLayout';
import type { LabsPortfolioDriveBackupConfig } from '../../shared/drive/labsPortfolioDriveBackupTypes';
import type { LabsPortfolioConflictAnalysis } from '../../shared/drive/labsPortfolioConflictAnalysis';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import { subscribeGestureLocalChanges } from '../db/gestureChangeBus';
import { readGestureLocalPayload } from '../db/gestureLocalData';
import type { GestureSyncPayload } from '../types';
import {
  analyzeGestureConflict,
  assessGestureDriveBackupConflict,
  shouldPromptGestureDriveMerge,
  type GestureDriveConflictReason,
} from './gestureDriveConflict';
import {
  buildGestureDriveEnvelope,
  envelopeToPayload,
  parseGestureDriveEnvelope,
  serializeGestureDriveEnvelope,
  type GestureDriveEnvelopeV1,
} from './gestureDriveEnvelope';
import {
  applyGestureConflictChoices,
  formatGestureDriveMergeReport,
  gestureMergeReportHasUserVisibleRemoteChanges,
  mergeGestureSyncPayload,
  type GestureDriveMergeReport,
} from './gestureDriveMerge';
import { prepareGestureDriveMerge } from './prepareGestureDriveMerge';
import { reindexGesturePacksMissingPhotos } from './gesturePackIndex';
import { reconcileDriveFolderMerges } from './gestureReconcileDriveFolderMerges';
import { reconcileStaleGestureUploadPacks } from './reconcileStaleGestureUploadPacks';
import { readGestureDriveSyncMeta, writeGestureDriveSyncMeta } from './gestureDriveSyncMeta';
import { formatMissingSidecarsMessage, runSidecarBatch } from '../../shared/drive/sidecarBatchTolerance';
import {
  findLatestGesturePrePullSnapshot,
  formatGestureDriveUndoSnapshotTrigger,
  listGestureDriveUndoSnapshots,
  parseGestureSnapshotEnvelope,
  pushGestureDriveUndoSnapshot,
  type GestureDriveUndoSnapshot,
} from './gestureDriveUndoSnapshots';

export type GestureDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteEnvelope: GestureDriveEnvelopeV1;
  analysis?: LabsPortfolioConflictAnalysis;
  etag: string | undefined;
  progressFileId: string;
  reasons?: GestureDriveConflictReason[];
};

export const gesturePortfolioDriveBackupConfig: LabsPortfolioDriveBackupConfig<
  GestureDriveEnvelopeV1,
  GestureSyncPayload,
  GestureDriveMergeReport,
  GestureDriveConflictReason,
  GestureDriveBackupConflictState,
  GestureDriveUndoSnapshot
> = {
  appFolderName: LABS_DRIVE_APP_FOLDER_GESTURE,
  ensureAccess: ({ interactive }) => ensureLabsGoogleAccessTokenForDrive({ interactive }),
  signIn: async () => {
    await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
  },
  readLocalPayload: readGestureLocalPayload,
  buildEnvelope: buildGestureDriveEnvelope,
  serializeEnvelope: serializeGestureDriveEnvelope,
  parseEnvelope: parseGestureDriveEnvelope,
  envelopeToPayload,
  // prepareGestureDriveMerge unions the envelope's Drive-folder/file tombstones into
  // local storage and returns them as merge options — skipped for history-recovery
  // slices, which carry no envelope (matching the bespoke hook's behavior).
  mergePayload: (local, remote, options) =>
    mergeGestureSyncPayload(
      local,
      remote,
      options?.remoteEnvelope ? prepareGestureDriveMerge(options.remoteEnvelope) : undefined,
    ),
  formatMergeReport: formatGestureDriveMergeReport,
  mergeReportHasRemoteChanges: gestureMergeReportHasUserVisibleRemoteChanges,
  resolveConflictChoices: ({ local, remoteEnvelope, choices }) =>
    applyGestureConflictChoices(
      local,
      envelopeToPayload(remoteEnvelope),
      choices,
      prepareGestureDriveMerge(remoteEnvelope),
    ),
  shouldPromptMerge: ({ syncMeta, cloudModifiedTime, remoteEnvelope, local }) =>
    shouldPromptGestureDriveMerge({
      syncMeta,
      cloudModifiedTime,
      remoteEnvelope,
      localPayload: local,
    }),
  assessConflict: assessGestureDriveBackupConflict,
  analyzeConflict: ({ syncMeta, local, remoteEnvelope }) =>
    analyzeGestureConflict({ syncMeta, local, remoteEnvelope }),
  buildConflictState: ({ meta, refs, remoteEnvelope, reasons, analysis }) => ({
    driveModifiedTime: meta.modifiedTime ?? '',
    remoteEnvelope,
    analysis,
    etag: meta.etag,
    progressFileId: refs.progressFileId,
    reasons,
  }),
  readSyncMeta: readGestureDriveSyncMeta,
  writeSyncMeta: writeGestureDriveSyncMeta,
  subscribeLocalChanges: (onChange) =>
    subscribeGestureLocalChanges((event) => onChange(event ?? {})),
  // Photos live in the user's own Drive folders (no uploads from the envelope path),
  // so "sidecar download" here means reconciling merged/renamed folders and
  // re-indexing packs whose photo lists are missing after a merge.
  downloadSidecars: async (token, _merged, onProgress) => {
    onProgress('Checking Drive photo folders…');
    /*
     * Three independent reconciliation steps, run through the tolerant batch so a folder the user
     * deleted in Drive (404) cannot stop the other two. Each step is the "item" here — unlike
     * Zinebox and Lyrefly, Gesture's photos live in the user's own folders, so there is no per-file
     * download loop to guard. Auth and rate-limit failures still stop the batch.
     */
    let reindexedPhotoCount = 0;
    const outcome = await runSidecarBatch(
      [
        { label: 'Drive folder merges', run: () => reconcileDriveFolderMerges(token) },
        {
          label: 'pack photo re-index',
          run: async () => {
            const reindex = await reindexGesturePacksMissingPhotos(token);
            reindexedPhotoCount = reindex.photoCount;
          },
        },
        { label: 'stale upload packs', run: () => reconcileStaleGestureUploadPacks(token) },
      ],
      async (step) => {
        await step.run();
      },
      { labelOf: (step) => step.label },
    );

    if (reindexedPhotoCount > 0) {
      onProgress(
        `Loaded ${reindexedPhotoCount} photo${reindexedPhotoCount === 1 ? '' : 's'} from Drive folders.`,
      );
    }
    const missing = formatMissingSidecarsMessage(outcome);
    if (missing) onProgress(missing);
  },
  needsSidecarDownload: (merged) => merged.packs.some((p) => Boolean(p.driveFolderId?.trim())),
  messages: {
    emptyPull: 'No Gesture Room backup on Drive yet.',
    saved: 'Progress saved to Google Drive.',
    silentPullChanged:
      'Drive backup changed on another device. Open your account menu to choose how to merge.',
    alreadyInSync: 'Already in sync with Drive.',
    silentSyncedPrefix: 'Synced from Drive',
  },
  undo: {
    listSnapshots: listGestureDriveUndoSnapshots,
    pushSnapshot: (envelope, trigger) =>
      pushGestureDriveUndoSnapshot(envelope, trigger as GestureDriveUndoSnapshot['trigger']),
    findLatestPrePull: findLatestGesturePrePullSnapshot,
    parseSnapshotEnvelope: parseGestureSnapshotEnvelope,
    formatSnapshotTrigger: (trigger) =>
      formatGestureDriveUndoSnapshotTrigger(trigger as GestureDriveUndoSnapshot['trigger']),
    canRestore: ({ testerOk }) => testerOk,
  },
  historyRecovery: {
    entityNoun: 'collection',
    listEntityIds: (payload) => payload.packs.map((p) => p.id),
    getEntityLabel: (id, payload) => payload.packs.find((p) => p.id === id)?.name,
    payloadWithEntity: (source, id) => {
      const pack = source.packs.find((p) => p.id === id);
      if (!pack) return null;
      return {
        packs: [pack],
        packFiles: source.packFiles.filter((f) => f.packId === id),
        drawHistory: source.drawHistory.filter((d) => d.packId === id),
      };
    },
  },
};
