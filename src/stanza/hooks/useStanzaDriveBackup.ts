/**
 * useStanzaDriveBackup — Drive backup orchestration for the Stanza account menu.
 *
 * Responsibilities (all driven by the shared LabsAccountMenu chrome):
 *   1. Detect a tester-allowlisted Google identity inherited from Encore.
 *   2. Probe the Drive `progress.json` for this app to surface a conflict UI when
 *      the local library disagrees with the remote (see `stanzaDriveConflict`).
 *   3. Run the merge / replace / cancel paths the conflict dialog exposes,
 *      including capturing a local "undo snapshot" before any destructive write
 *      (see ADR 0006).
 *   4. Manage the busy + last-message state the menu renders.
 *
 * Read alongside:
 *   - ADR 0006 (`docs/adr/0006-stanza-drive-backup-merge-and-restore.md`)
 *   - ADR 0007 (Encore-owned practice resources, Stanza secondary client)
 *   - `src/stanza/drive/stanzaDriveEnvelope.ts` (on-disk schema)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_STANZA,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import {
  ensureLabsGoogleAccessTokenForDrive,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  isEmailAllowedLabsDriveBackup,
} from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import { remapStanzaTakesForConsolidation } from '../db/stanzaConsolidateLocalLibrary';
import {
  assessStanzaDriveBackupConflict,
  shouldPromptStanzaDriveMerge,
  type StanzaDriveConflictReason,
} from '../drive/stanzaDriveConflict';
import {
  buildStanzaDriveEnvelope,
  parseStanzaDriveEnvelope,
  serializeStanzaDriveEnvelope,
  type StanzaDriveEnvelopeV1,
} from '../drive/stanzaDriveEnvelope';
import {
  formatStanzaDriveMergeReport,
  mergeDriveRowsIntoLocalLibrary,
  type StanzaDriveMergeReport,
} from '../drive/stanzaDriveMerge';
import {
  buildStanzaPracticeOverlayFromRows,
  mergeStanzaPracticeOverlayIntoRows,
  readStanzaPracticeOverlayFromDrive,
  resolveEncoreAppFolderId,
  writeStanzaPracticeOverlayToDrive,
} from '../drive/stanzaPracticeOverlaySync';
import {
  hydrateStanzaLibraryMainMediaFromDrive,
  syncStanzaLibraryMainMediaToDrive,
} from '../drive/stanzaDriveMainMediaSync';
import {
  hydrateStanzaLibraryStemsFromDrive,
  syncStanzaLibraryStemsToDrive,
} from '../drive/stanzaDriveStemSync';
import {
  patchStanzaDriveSyncMeta,
  readStanzaDriveSyncMeta,
  stanzaDriveFolderUrl,
} from '../drive/stanzaDriveSyncMeta';
import {
  clearStanzaDriveTombstone,
  getStanzaDriveTombstoneFileIds,
  unionStanzaDriveTombstones,
} from '../drive/stanzaDriveTombstones';
import {
  getStanzaYoutubeTombstoneVideoIds,
  unionStanzaYoutubeTombstones,
} from '../drive/stanzaYoutubeTombstones';
import {
  findLatestPrePullSnapshot,
  listStanzaDriveUndoSnapshots,
  parseSnapshotEnvelope,
  pushStanzaDriveUndoSnapshot,
  type StanzaDriveUndoSnapshot,
} from '../drive/stanzaDriveUndoSnapshots';
import {
  countSongsThatWouldGainMarkersFromSnapshot,
  countSongsWhereLocalHasMoreMarkers,
  totalMarkerCount,
} from '../drive/stanzaDriveMarkerSummary';
import { labsDriveAutoPushAllowed } from '../../shared/drive/labsDriveSyncGuard';
import {
  formatLabsDriveSyncError,
  LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE,
} from '../../shared/drive/labsDriveSyncMessages';
import { useLabsDrivePortfolioAutoSync } from '../../shared/drive/useLabsDrivePortfolioAutoSync';

export function stanzaGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type StanzaDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteSongCount: number;
  localSongCount: number;
  /** Songs where this device has more section markers than Drive. */
  localSongsWithMoreMarkers: number;
  localSectionCount: number;
  remoteSectionCount: number;
  reasons: StanzaDriveConflictReason[];
  remoteEnvelope: StanzaDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

/**
 * Module-level flag set while a Drive→local merge is rewriting the songs table. The auto-push
 * effect's Dexie hook listener checks this so its own merge writes don't immediately schedule a
 * push back to Drive (which would clobber the same data we just pulled).
 */
let stanzaDriveMergeInProgress = false;

async function persistMergedSongs(nextRows: StanzaSong[]): Promise<void> {
  stanzaDriveMergeInProgress = true;
  try {
    await stanzaDb.transaction('rw', stanzaDb.songs, async () => {
      const keep = new Set(nextRows.map((s) => s.id));
      for (const row of await stanzaDb.songs.toArray()) {
        if (!keep.has(row.id)) {
          await stanzaDb.songs.delete(row.id);
        }
      }
      for (const r of nextRows) {
        await stanzaDb.songs.put(r);
      }
    });
  } finally {
    stanzaDriveMergeInProgress = false;
  }
}

/**
 * Perform a non-destructive merge of `remoteEnvelope.songs` into the local library and update
 * sync meta. Used by both the manual "Merge then upload" path and the silent auto-pull path.
 * Returns the merge report for messaging.
 *
 * After persisting, any `remappedIds` produced by `consolidateStanzaSongDuplicates` (called
 * inside `mergeDriveRowsIntoLocalLibrary`) are forwarded to `remapStanzaTakesForConsolidation`
 * so practice takes don't dangle on rows that were just collapsed.
 *
 * **Deletion tombstones** (ADR 0006):
 *   - Remote tombstones from `remoteEnvelope.deletedDriveSourceFileIds` are unioned into the
 *     local store **before** the merge runs, so a deletion that originated on another device
 *     suppresses re-adding the corresponding remote row on this device.
 *   - The merged tombstone set is passed into `mergeDriveRowsIntoLocalLibrary`. Stale entries
 *     (where a local row still has that `driveSourceFileId`) are cleared from the local store
 *     so subsequent pushes don't re-broadcast a reversed deletion.
 */
async function snapshotLocalLibraryBeforeMerge(
  trigger: Parameters<typeof pushStanzaDriveUndoSnapshot>[1],
): Promise<void> {
  try {
    const envelope = await buildStanzaDriveEnvelope();
    await pushStanzaDriveUndoSnapshot(envelope, trigger);
  } catch {
    /* quota / private mode — merge still proceeds */
  }
}

async function tryHydrateLibraryFromDrive(opts?: {
  interactive?: boolean;
  accessToken?: string;
}): Promise<{ mainMediaSongs: number; stemSongs: number }> {
  try {
    const token =
      opts?.accessToken ??
      (await ensureLabsGoogleAccessTokenForDrive({ interactive: opts?.interactive !== false }));
    const mainMediaSongs = await hydrateStanzaLibraryMainMediaFromDrive(token);
    const stemSongs = await hydrateStanzaLibraryStemsFromDrive(token);
    return { mainMediaSongs, stemSongs };
  } catch {
    return { mainMediaSongs: 0, stemSongs: 0 };
  }
}

async function mergeRemoteEnvelopeIntoLocal(
  remoteEnvelope: StanzaDriveEnvelopeV1,
  opts?: { accessToken?: string; hydrateInteractive?: boolean },
): Promise<{
  added: number;
  updatedFromRemote: number;
  keptLocal: number;
  collapsedDupes: number;
  skippedTombstoned: number;
  markersRecoveredFromLocal: number;
  report: StanzaDriveMergeReport;
}> {
  if (remoteEnvelope.deletedDriveSourceFileIds?.length) {
    unionStanzaDriveTombstones(remoteEnvelope.deletedDriveSourceFileIds);
  }
  if (remoteEnvelope.deletedYoutubeVideoIds?.length) {
    unionStanzaYoutubeTombstones(remoteEnvelope.deletedYoutubeVideoIds);
  }
  const tombstoneFileIds = getStanzaDriveTombstoneFileIds();
  const youtubeTombstoneVideoIds = getStanzaYoutubeTombstoneVideoIds();
  const localRows = await stanzaDb.songs.toArray();
  const { nextRows, remappedIds, report, staleTombstoneFileIds } = mergeDriveRowsIntoLocalLibrary(
    localRows,
    remoteEnvelope.songs,
    { tombstoneFileIds, youtubeTombstoneVideoIds },
  );
  await persistMergedSongs(nextRows);
  await remapStanzaTakesForConsolidation(remappedIds);
  for (const fid of staleTombstoneFileIds) {
    clearStanzaDriveTombstone(fid);
  }
  await tryHydrateLibraryFromDrive({
    accessToken: opts?.accessToken,
    interactive: opts?.hydrateInteractive,
  });
  if (opts?.accessToken) {
    const encoreRootId = await resolveEncoreAppFolderId(opts.accessToken);
    if (encoreRootId) {
      const overlay = await readStanzaPracticeOverlayFromDrive(opts.accessToken, encoreRootId);
      if (overlay) {
        const overlayRows = await stanzaDb.songs.toArray();
        const mergedOverlay = mergeStanzaPracticeOverlayIntoRows(overlayRows, overlay);
        await persistMergedSongs(mergedOverlay);
      }
    }
  }
  return {
    added: report.addedFromRemote,
    updatedFromRemote: report.mergedPreferRemote,
    keptLocal: report.keptLocalOnly + report.mergedPreferLocal,
    collapsedDupes: report.collapsedByContentKey,
    skippedTombstoned: report.skippedTombstoned,
    markersRecoveredFromLocal: report.markersRecoveredFromLocal,
    report,
  };
}

export function useStanzaDriveBackup() {
  const identity = useLabsEncoreGoogleIdentity();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<StanzaDriveBackupConflictState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [undoSnapshots, setUndoSnapshots] = useState<StanzaDriveUndoSnapshot[]>([]);
  const [syncMetaTick, setSyncMetaTick] = useState(0);
  /**
   * `progress.json` we last pulled in this session — kept in memory so the Restore dialog can
   * show "Latest from Drive" even when the local snapshot store is empty (e.g. a brand-new
   * device that hasn't backed up yet). Refreshed on every successful auto-pull / explicit pull.
   */
  const [latestRemoteEnvelope, setLatestRemoteEnvelope] = useState<StanzaDriveEnvelopeV1 | null>(null);
  /**
   * Auto-push state. We treat any successful push or pull as "session-bound", so we don't try
   * to write back to Drive until we've at least seen the remote once and merged it (otherwise
   * a fresh device with empty IndexedDB would happily overwrite Drive on the first edit).
   */
  const refreshUndoSnapshots = useCallback(async () => {
    const rows = await listStanzaDriveUndoSnapshots();
    setUndoSnapshots(rows);
  }, []);

  useEffect(() => {
    void refreshUndoSnapshots();
  }, [refreshUndoSnapshots, syncMetaTick]);

  /** True after a successful session pull — gates debounced auto-push with manual backup. */
  const sessionPullSucceededRef = useRef(false);
  const manualBackupSucceededRef = useRef(false);
  const pullFromDriveAndMergeRef = useRef<(opts?: { silent?: boolean }) => Promise<unknown>>(async () => undefined);
  const [syncPaused, setSyncPaused] = useState(false);

  const allowAutoPush = useCallback(
    () => labsDriveAutoPushAllowed(sessionPullSucceededRef.current, manualBackupSucceededRef.current),
    [],
  );

  const markPullSucceeded = useCallback(() => {
    sessionPullSucceededRef.current = true;
    setSyncPaused(false);
  }, []);

  const markManualBackupSucceeded = useCallback(() => {
    manualBackupSucceededRef.current = true;
    setSyncPaused(false);
  }, []);

  const formatMergeUserMessage = useCallback((report: StanzaDriveMergeReport, intro: string) => {
    let msg = `${intro}${formatStanzaDriveMergeReport(report)}).`;
    if (report.markersRecoveredFromLocal > 0) {
      msg += ` Kept your section markers for ${report.markersRecoveredFromLocal} song${report.markersRecoveredFromLocal === 1 ? '' : 's'}.`;
    }
    return msg;
  }, []);

  useEffect(() => {
    if (!identity?.email) {
      setTesterOk(false);
      setTesterResolved(true);
      return;
    }
    setTesterResolved(false);
    let cancelled = false;
    void isEmailAllowedLabsDriveBackup(identity.email).then((ok) => {
      if (!cancelled) {
        setTesterOk(ok);
        setTesterResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [identity?.email]);

  const flushDriveWrite = useCallback(async (opts?: { silent?: boolean }) => {
    const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
    const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_STANZA);
    const writeOnce = async () => {
      await syncStanzaLibraryMainMediaToDrive(token, refs.appFolderId);
      await syncStanzaLibraryStemsToDrive(token, refs.appFolderId);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const envelope = await buildStanzaDriveEnvelope();
      const body = serializeStanzaDriveEnvelope(envelope);
      await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
      const encoreRootId = await resolveEncoreAppFolderId(token);
      if (encoreRootId) {
        const rows = await stanzaDb.songs.toArray();
        const overlay = buildStanzaPracticeOverlayFromRows(rows);
        await writeStanzaPracticeOverlayToDrive(token, encoreRootId, overlay);
      }
      const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      patchStanzaDriveSyncMeta({
        lastCloudModifiedTime: metaAfter.modifiedTime,
        lastBackupExportedAt: envelope.exportedAt,
        driveAppFolderId: refs.appFolderId,
        driveProgressFileId: refs.progressFileId,
        lastAutoPushAt: opts?.silent ? Date.now() : undefined,
      });
      setSyncMetaTick((n) => n + 1);
      setLatestRemoteEnvelope(envelope);
      if (!opts?.silent) {
        setMessage('Saved to Drive.');
      }
    };
    try {
      await writeOnce();
    } catch (e) {
      if (e instanceof DriveHttpError && e.status === 412) {
        await pullFromDriveAndMergeRef.current({ silent: true });
        await writeOnce();
        return;
      }
      throw e;
    }
  }, []);

  /**
   * Pull the remote envelope and merge it into the local library, non-destructively. Used by:
   *   - The auto-pull effect on app open / when the user signs in.
   *   - The Restore dialog's "Latest from Drive" entry (re-runs the pull explicitly).
   *
   * `silent` skips the chrome message and the busy spinner — the auto-pull path uses it so
   * a typical session start doesn't spawn a "merged 0 songs" toast every time.
   */
  const pullFromDriveAndMerge = useCallback(
    async (opts?: { silent?: boolean }) => {
      // See `flushDriveWrite` for the `silent` ↔ `interactive` mapping (ADR 0011).
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_STANZA);
      const meta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      let remoteEnvelope: StanzaDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseStanzaDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }
      const syncMetaBefore = readStanzaDriveSyncMeta();
      const localRows = await stanzaDb.songs.toArray();
      if (
        remoteEnvelope &&
        shouldPromptStanzaDriveMerge({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
          localRows,
        })
      ) {
        const assessment = assessStanzaDriveBackupConflict({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
        });
        setLatestRemoteEnvelope(remoteEnvelope);
        setConflict({
          driveModifiedTime: meta.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remoteSongCount: remoteEnvelope.songs.length,
          localSongCount: localRows.length,
          localSongsWithMoreMarkers: countSongsWhereLocalHasMoreMarkers(localRows, remoteEnvelope.songs),
          localSectionCount: totalMarkerCount(localRows),
          remoteSectionCount: totalMarkerCount(remoteEnvelope.songs),
          reasons: assessment.reasons,
          remoteEnvelope,
          etag: meta.etag,
          progressFileId: refs.progressFileId,
        });
        if (opts?.silent) {
          setMessage('Drive backup changed on another device. Open your account menu to choose how to merge.');
        }
        return { conflictPrompt: true as const };
      }
      patchStanzaDriveSyncMeta({
        driveAppFolderId: refs.appFolderId,
        driveProgressFileId: refs.progressFileId,
        lastCloudModifiedTime: meta.modifiedTime,
        // Mark the local "last seen export" so subsequent auto-pushes don't trigger the
        // first-device conflict UI; we've now seen what's there.
        lastBackupExportedAt: remoteEnvelope?.exportedAt,
        lastAutoPullAt: Date.now(),
      });
      setSyncMetaTick((n) => n + 1);
      if (!remoteEnvelope) {
        markPullSucceeded();
        if (!opts?.silent) setMessage('No Stanza backup on Drive yet.');
        return { added: 0, updatedFromRemote: 0, keptLocal: 0, collapsedDupes: 0 };
      }
      setLatestRemoteEnvelope(remoteEnvelope);
      await snapshotLocalLibraryBeforeMerge('pre-pull');
      const result = await mergeRemoteEnvelopeIntoLocal(remoteEnvelope, {
        accessToken: token,
        hydrateInteractive: !opts?.silent,
      });
      markPullSucceeded();
      setSyncMetaTick((n) => n + 1);
      if (!opts?.silent) {
        const parts = [];
        if (result.added > 0) parts.push(`pulled ${result.added}`);
        if (result.updatedFromRemote > 0) parts.push(`updated ${result.updatedFromRemote}`);
        if (result.keptLocal > 0) parts.push(`kept ${result.keptLocal} local`);
        if (result.collapsedDupes > 0) {
          parts.push(`collapsed ${result.collapsedDupes} duplicate${result.collapsedDupes === 1 ? '' : 's'}`);
        }
        let msg =
          parts.length > 0 ? `Synced from Drive (${parts.join(', ')}).` : 'Already in sync with Drive.';
        if (result.markersRecoveredFromLocal > 0) {
          msg += ` Kept your section markers for ${result.markersRecoveredFromLocal} song${result.markersRecoveredFromLocal === 1 ? '' : 's'}.`;
        }
        setMessage(msg);
      }
      return result;
    },
    [markPullSucceeded],
  );
  pullFromDriveAndMergeRef.current = pullFromDriveAndMerge;

  const onSignIn = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      const msg =
        e instanceof DriveHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Google sign-in did not finish.';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  const onBackup = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive();
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_STANZA);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const localRows = await stanzaDb.songs.toArray();
      const localEnvelope = await buildStanzaDriveEnvelope();
      await pushStanzaDriveUndoSnapshot(localEnvelope, 'manual-backup');
      setSyncMetaTick((n) => n + 1);

      let remoteEnvelope: StanzaDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseStanzaDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }

      const assessment = assessStanzaDriveBackupConflict({
        syncMeta: readStanzaDriveSyncMeta(),
        cloudModifiedTime: metaBefore.modifiedTime,
        remoteEnvelope,
      });

      if (
        remoteEnvelope &&
        shouldPromptStanzaDriveMerge({
          syncMeta: readStanzaDriveSyncMeta(),
          cloudModifiedTime: metaBefore.modifiedTime,
          remoteEnvelope,
          localRows,
        })
      ) {
        setConflict({
          driveModifiedTime: metaBefore.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remoteSongCount: remoteEnvelope.songs.length,
          localSongCount: localRows.length,
          localSongsWithMoreMarkers: countSongsWhereLocalHasMoreMarkers(localRows, remoteEnvelope.songs),
          localSectionCount: totalMarkerCount(localRows),
          remoteSectionCount: totalMarkerCount(remoteEnvelope.songs),
          reasons: assessment.reasons,
          remoteEnvelope,
          etag: metaBefore.etag,
          progressFileId: refs.progressFileId,
        });
        return;
      }

      await flushDriveWrite();
      markManualBackupSucceeded();
    } catch (e) {
      const msg =
        e instanceof DriveHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Backup failed.';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [flushDriveWrite, markManualBackupSucceeded]);

  const cancelConflict = useCallback(() => {
    setConflict(null);
  }, []);

  const confirmReplaceDriveOnly = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      await flushDriveWrite();
      markManualBackupSucceeded();
      setConflict(null);
    } catch (e) {
      const msg =
        e instanceof DriveHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Backup failed.';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [conflict, flushDriveWrite, markManualBackupSucceeded]);

  const confirmMergeThenUpload = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      // Same tombstone treatment as the auto-pull path (see `mergeRemoteEnvelopeIntoLocal`):
      // any remote tombstones in the conflicted envelope are unioned in first; the merge then
      // skips remote rows the user (or another device) previously removed.
      if (conflict.remoteEnvelope.deletedDriveSourceFileIds?.length) {
        unionStanzaDriveTombstones(conflict.remoteEnvelope.deletedDriveSourceFileIds);
      }
      if (conflict.remoteEnvelope.deletedYoutubeVideoIds?.length) {
        unionStanzaYoutubeTombstones(conflict.remoteEnvelope.deletedYoutubeVideoIds);
      }
      await snapshotLocalLibraryBeforeMerge('pre-merge');
      const tombstoneFileIds = getStanzaDriveTombstoneFileIds();
      const youtubeTombstoneVideoIds = getStanzaYoutubeTombstoneVideoIds();
      const localRows = await stanzaDb.songs.toArray();
      const { nextRows, remappedIds, report, staleTombstoneFileIds } = mergeDriveRowsIntoLocalLibrary(
        localRows,
        conflict.remoteEnvelope.songs,
        { tombstoneFileIds, youtubeTombstoneVideoIds },
      );
      await persistMergedSongs(nextRows);
      await remapStanzaTakesForConsolidation(remappedIds);
      for (const fid of staleTombstoneFileIds) {
        clearStanzaDriveTombstone(fid);
      }
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const hydrated = await tryHydrateLibraryFromDrive({
        accessToken: token,
        interactive: true,
      });
      patchStanzaDriveSyncMeta({
        lastCloudModifiedTime: conflict.driveModifiedTime,
        lastBackupExportedAt: conflict.remoteEnvelope.exportedAt,
        lastAutoPullAt: Date.now(),
      });
      markPullSucceeded();
      setLatestRemoteEnvelope(conflict.remoteEnvelope);
      let mergeMsg = `${formatMergeUserMessage(report, 'Merged library (')}, then saved to Drive.`;
      if (hydrated.mainMediaSongs > 0) {
        mergeMsg += ` Downloaded recordings for ${hydrated.mainMediaSongs} song${hydrated.mainMediaSongs === 1 ? '' : 's'}.`;
      }
      if (hydrated.stemSongs > 0) {
        mergeMsg += ` Downloaded mix layers for ${hydrated.stemSongs} song${hydrated.stemSongs === 1 ? '' : 's'}.`;
      }
      setMessage(mergeMsg);
      setSyncMetaTick((n) => n + 1);
      setConflict(null);
      await flushDriveWrite();
      markManualBackupSucceeded();
    } catch (e) {
      const msg =
        e instanceof DriveHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Merge or backup failed.';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [conflict, flushDriveWrite, formatMergeUserMessage, markManualBackupSucceeded, markPullSucceeded]);

  const openRestorePicker = useCallback(() => {
    setRestoreOpen(true);
  }, []);

  const closeRestorePicker = useCallback(() => {
    setRestoreOpen(false);
  }, []);

  const applyUndoSnapshot = useCallback(
    async (snap: StanzaDriveUndoSnapshot) => {
      setBusy(true);
      try {
        const env = parseSnapshotEnvelope(snap);
        const localRows = await stanzaDb.songs.toArray();
        const gainCount = countSongsThatWouldGainMarkersFromSnapshot(localRows, env.songs);
        if (gainCount > 0) {
          const ok = window.confirm(
            `This will bring back sections for ${gainCount} song${gainCount === 1 ? '' : 's'}. Continue?`,
          );
          if (!ok) return;
        }
        await snapshotLocalLibraryBeforeMerge('pre-restore');
        // Snapshot restore is the user's explicit "go back to that state" intent — we do NOT
        // pass tombstones to the merge here, so previously-removed rows in the snapshot come
        // back. Tombstones for any restored `driveSourceFileId` are then cleared so subsequent
        // pushes don't immediately re-broadcast the deletion.
        const { nextRows, remappedIds, report } = mergeDriveRowsIntoLocalLibrary(localRows, env.songs);
        await persistMergedSongs(nextRows);
        await remapStanzaTakesForConsolidation(remappedIds);
        const restoredDriveFileIds = new Set<string>();
        for (const row of nextRows) {
          const fid = row.driveSourceFileId?.trim();
          if (fid) restoredDriveFileIds.add(fid);
        }
        for (const fid of restoredDriveFileIds) {
          clearStanzaDriveTombstone(fid);
        }
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const hydrated = await tryHydrateLibraryFromDrive({
          accessToken: token,
          interactive: true,
        });
        setRestoreOpen(false);
        setSyncMetaTick((n) => n + 1);
        setMessage(() => {
          let msg = `Restored snapshot from ${snap.label}. ${formatStanzaDriveMergeReport(report)}`;
          if (report.markersRecoveredFromLocal > 0) {
            msg += ` Kept your section markers for ${report.markersRecoveredFromLocal} song${report.markersRecoveredFromLocal === 1 ? '' : 's'}.`;
          }
          if (hydrated.mainMediaSongs > 0) {
            msg += ` Downloaded recordings for ${hydrated.mainMediaSongs} song${hydrated.mainMediaSongs === 1 ? '' : 's'}.`;
          }
          if (hydrated.stemSongs > 0) {
            msg += ` Downloaded mix layers for ${hydrated.stemSongs} song${hydrated.stemSongs === 1 ? '' : 's'}.`;
          }
          return msg;
        });
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Restore failed.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const restoreLatestPrePullSnapshot = useCallback(async () => {
    setBusy(true);
    try {
      const snap = await findLatestPrePullSnapshot();
      if (!snap) {
        setMessage('No undo-last-sync snapshot found yet. Snapshots are saved before each Drive sync.');
        return;
      }
      await applyUndoSnapshot(snap);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Undo last sync failed.');
    } finally {
      setBusy(false);
    }
  }, [applyUndoSnapshot]);

  /** Re-merge the latest envelope we already pulled from Drive in this session. */
  const restoreLatestFromDrive = useCallback(async () => {
    setBusy(true);
    try {
      await pullFromDriveAndMerge({ silent: false });
      setRestoreOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Restore from Drive failed.');
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  const handleAutoPullError = useCallback((msg: string) => {
    setMessage(msg);
    setSyncPaused(true);
  }, []);

  const handleAutoPushError = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  const { notifyAutoPushCompleted } = useLabsDrivePortfolioAutoSync({
    enabled: testerResolved && testerOk,
    allowAutoPush,
    pullFromDriveAndMerge,
    flushDriveWrite,
    isMergeInProgress: () => stanzaDriveMergeInProgress,
    onAutoPullError: handleAutoPullError,
    onAutoPushError: handleAutoPushError,
    afterSilentAutoPull: async (result) => {
      const pullResult = result as { conflictPrompt?: boolean; collapsedDupes?: number } | undefined;
      if (pullResult?.conflictPrompt) return;
      if ((pullResult?.collapsedDupes ?? 0) > 0) {
        try {
          await flushDriveWrite({ silent: true });
          notifyAutoPushCompleted();
        } catch {
          /* next user edit retries */
        }
      }
    },
    subscribeLocalChanges: (onChange) => {
      const dexieListener = () => onChange();
      stanzaDb.songs.hook('creating', dexieListener);
      stanzaDb.songs.hook('updating', dexieListener);
      stanzaDb.songs.hook('deleting', dexieListener);
      return () => {
        stanzaDb.songs.hook('creating').unsubscribe(dexieListener);
        stanzaDb.songs.hook('updating').unsubscribe(dexieListener);
        stanzaDb.songs.hook('deleting').unsubscribe(dexieListener);
      };
    },
  });

  const retryPullFromDrive = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  // Re-read sync meta on every meaningful change so consumers see fresh `lastCloudModifiedTime`
  // / `lastAutoPullAt` without re-rendering for unrelated reasons.
  const lastMeta = useMemo(() => {
    void syncMetaTick;
    return readStanzaDriveSyncMeta();
  }, [syncMetaTick]);

  return {
    identity,
    testerOk,
    testerResolved,
    busy,
    message: syncPaused && !message ? LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE : message,
    dismissMessage: () => setMessage(null),
    syncPaused,
    retryPullFromDrive,
    onBackup,
    onSignIn,
    lastMeta,
    driveFolderUrl: stanzaDriveFolderUrl(lastMeta.driveAppFolderId),
    conflict,
    cancelConflict,
    confirmMergeThenUpload,
    confirmReplaceDriveOnly,
    restoreOpen,
    openRestorePicker,
    closeRestorePicker,
    undoSnapshots,
    applyUndoSnapshot,
    restoreLatestPrePullSnapshot,
    canUndoLastSync: undoSnapshots.some((s) => s.trigger === 'pre-pull'),
    /**
     * True when the device has a Drive backup we can restore from (snapshot or fresh pull).
     * Drives the Restore button's disabled state.
     */
    canRestore:
      testerOk &&
      (latestRemoteEnvelope != null ||
        Boolean(lastMeta.lastBackupExportedAt) ||
        undoSnapshots.length > 0),
    /** In-memory copy of the most recently fetched Drive envelope; used by the Restore dialog. */
    latestRemoteEnvelope,
    restoreLatestFromDrive,
  };
}
