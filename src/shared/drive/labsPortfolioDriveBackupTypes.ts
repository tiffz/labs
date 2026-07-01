import type { LabsDrivePortfolioLocalChangeEvent } from './useLabsDrivePortfolioAutoSync';

export type LabsPortfolioDriveSyncMeta = {
  lastCloudModifiedTime?: string;
  lastBackupExportedAt?: string;
  driveAppFolderId?: string;
};

export type LabsPortfolioDriveBackupConflictBase<TEnvelope> = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteEnvelope: TEnvelope;
  etag: string | undefined;
  progressFileId: string;
};

export type LabsPortfolioDriveBackupConfig<
  TEnvelope extends { exportedAt: string },
  TPayload,
  TMergeReport,
  TConflictReason,
  TConflictState extends LabsPortfolioDriveBackupConflictBase<TEnvelope>,
  TUndoSnapshot = never,
> = {
  appFolderName: string;
  ensureAccess: (options: { interactive: boolean }) => Promise<string>;
  signIn: () => Promise<void>;
  readLocalPayload: () => Promise<TPayload>;
  buildEnvelope: (local: TPayload) => TEnvelope;
  serializeEnvelope: (envelope: TEnvelope) => string;
  parseEnvelope: (json: string) => TEnvelope;
  envelopeToPayload: (envelope: TEnvelope) => TPayload;
  mergePayload: (
    local: TPayload,
    remote: TPayload,
    options?: { remoteEnvelope?: TEnvelope },
  ) => { payload: TPayload; report: TMergeReport };
  formatMergeReport: (report: TMergeReport) => string;
  mergeReportHasRemoteChanges: (report: TMergeReport) => boolean;
  shouldPromptMerge: (args: {
    syncMeta: LabsPortfolioDriveSyncMeta;
    cloudModifiedTime: string | undefined;
    remoteEnvelope: TEnvelope;
    local: TPayload;
    localUpdatedAtMs: number;
  }) => boolean;
  assessConflict: (args: {
    syncMeta: LabsPortfolioDriveSyncMeta;
    cloudModifiedTime: string | undefined;
    remoteEnvelope: TEnvelope;
  }) => { reasons: TConflictReason[] };
  buildConflictState: (args: {
    meta: { modifiedTime?: string; etag?: string };
    refs: { progressFileId: string };
    remoteEnvelope: TEnvelope;
    local: TPayload;
    reasons: TConflictReason[];
  }) => TConflictState;
  readSyncMeta: () => LabsPortfolioDriveSyncMeta;
  writeSyncMeta: (meta: LabsPortfolioDriveSyncMeta) => void;
  subscribeLocalChanges: (onChange: (event: LabsDrivePortfolioLocalChangeEvent) => void) => () => void;
  uploadSidecars?: (
    token: string,
    appFolderId: string,
    local: TPayload,
    onLabel: (label: string) => void,
  ) => Promise<void>;
  downloadSidecars?: (
    token: string,
    merged: TPayload,
    onProgress: (label: string) => void,
  ) => Promise<void>;
  needsSidecarDownload?: (merged: TPayload) => boolean;
  countRemoteItems?: (envelope: TEnvelope) => number;
  countLocalItems?: (local: TPayload) => number;
  messages: {
    emptyPull: string;
    saved: string;
    silentPullChanged: string;
    alreadyInSync: string;
    silentSyncedPrefix: string;
  };
  undo?: {
    listSnapshots: () => TUndoSnapshot[];
    pushSnapshot: (envelope: TEnvelope, trigger: string) => void;
    findLatestPrePull: () => TUndoSnapshot | null | undefined;
    parseSnapshotEnvelope: (snap: TUndoSnapshot) => TEnvelope;
    formatSnapshotTrigger: (trigger: string) => string;
    canRestore: (args: {
      testerOk: boolean;
      latestRemoteEnvelope: TEnvelope | null;
      lastMeta: LabsPortfolioDriveSyncMeta;
      undoSnapshots: readonly TUndoSnapshot[];
    }) => boolean;
  };
  historyRecovery?: {
    entityNoun: string;
    listEntityIds: (payload: TPayload) => string[];
    getEntityLabel: (id: string, payload: TPayload) => string | undefined;
    /** Build a remote-only slice containing `id` for non-destructive merge. */
    payloadWithEntity: (source: TPayload, id: string) => TPayload | null;
  };
};
