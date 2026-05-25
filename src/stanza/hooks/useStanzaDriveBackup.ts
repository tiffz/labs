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
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  getLabsDriveTesterHashesFromEnv,
  isEmailAllowedLabsDriveTester,
} from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import { remapStanzaTakesForConsolidation } from '../db/stanzaConsolidateLocalLibrary';
import { assessStanzaDriveBackupConflict, type StanzaDriveConflictReason } from '../drive/stanzaDriveConflict';
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

export function stanzaGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export function stanzaDriveTesterAllowlistEmpty(): boolean {
  return getLabsDriveTesterHashesFromEnv().size === 0;
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
 * Auto-push debounce window (ms). Local edits are coalesced so a slider drag or rapid marker
 * adds don't fire a flurry of Drive writes. Long enough to bundle a typical multi-control edit
 * (key shift, BPM tweak, mark a section), short enough to feel "live".
 */
const STANZA_DRIVE_AUTO_PUSH_DEBOUNCE_MS = 6_000;
/** Minimum spacing between auto-pushes — guards against editing-as-fast-as-debounce. */
const STANZA_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS = 4_000;

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

async function mergeRemoteEnvelopeIntoLocal(
  remoteEnvelope: StanzaDriveEnvelopeV1,
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

  const autoPushTimerRef = useRef<number | null>(null);
  const autoPushInFlightRef = useRef(false);
  const lastAutoPushAtRef = useRef(0);
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
    void isEmailAllowedLabsDriveTester(identity.email).then((ok) => {
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
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const envelope = await buildStanzaDriveEnvelope();
      const body = serializeStanzaDriveEnvelope(envelope);
      await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
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
        setMessage('Saved to Drive. Audio stays on this device.');
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
      const result = await mergeRemoteEnvelopeIntoLocal(remoteEnvelope);
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

      if (assessment.needsPrompt && remoteEnvelope) {
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
      setMessage(`${formatMergeUserMessage(report, 'Merged library (')}, then saved to Drive.`);
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
  }, [conflict, flushDriveWrite, formatMergeUserMessage, markManualBackupSucceeded]);

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
        setRestoreOpen(false);
        setSyncMetaTick((n) => n + 1);
        setMessage(() => {
          let msg = `Restored snapshot from ${snap.label}. ${formatStanzaDriveMergeReport(report)}`;
          if (report.markersRecoveredFromLocal > 0) {
            msg += ` Kept your section markers for ${report.markersRecoveredFromLocal} song${report.markersRecoveredFromLocal === 1 ? '' : 's'}.`;
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

  /**
   * Auto-pull on the first render where we have a tester-allowed identity. One-shot per session
   * so we don't spam Drive on every focus / re-render. After this resolves, the auto-push effect
   * is allowed to fire after a successful pull (or manual backup).
   *
   * If the merge collapses any cross-device duplicates we follow up with an immediate push so
   * the cleaned library propagates back to Drive (otherwise the next device that auto-pulls
   * would see the dupes again and we'd play whack-a-mole forever). The `stanzaDriveMergeInProgress`
   * suppression flag means the merge writes don't trigger the debounced push by themselves, so
   * this explicit flush is what actually closes the loop.
   */
  const autoPullStartedRef = useRef(false);
  useEffect(() => {
    if (!testerResolved || !testerOk || autoPullStartedRef.current) return;
    autoPullStartedRef.current = true;
    void (async () => {
      try {
        const result = await pullFromDriveAndMerge({ silent: true });
        if (result.collapsedDupes > 0) {
          try {
            await flushDriveWrite({ silent: true });
            lastAutoPushAtRef.current = Date.now();
          } catch {
            // The next user edit will retry; no need to surface a transient push failure here.
          }
        }
      } catch (e) {
        const msg =
          e instanceof LabsGoogleInteractiveAuthRequiredError
            ? 'Drive sync paused. Sign in again to pull the latest from Drive.'
            : e instanceof DriveHttpError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'Drive auto-pull failed.';
        // Surface the failure so the user understands why their devices look out of sync, but
        // don't block the UI — they can still edit locally and a manual backup recovers later.
        setMessage(msg);
        setSyncPaused(true);
      }
    })();
  }, [testerResolved, testerOk, pullFromDriveAndMerge, flushDriveWrite]);

  /**
   * Auto-push: subscribe to Dexie `songs` changes (any local edit bumps `updatedAt`) and
   * schedule a Drive write after a quiet period. Skips if we haven't completed the initial
   * auto-pull, or if a push was just done; if a write fails we surface the message but don't
   * retry — the next user edit will retry, and a manual "Back up" still works.
   */
  useEffect(() => {
    if (!testerResolved || !testerOk) return;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      if (autoPushTimerRef.current != null) {
        window.clearTimeout(autoPushTimerRef.current);
      }
      autoPushTimerRef.current = window.setTimeout(() => {
        autoPushTimerRef.current = null;
        if (cancelled) return;
        if (!allowAutoPush()) return;
        if (autoPushInFlightRef.current) return;
        const sinceLast = Date.now() - lastAutoPushAtRef.current;
        if (sinceLast < STANZA_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS) {
          // Re-arm rather than push: we've written too recently. Quiet to avoid runaway pushes
          // when many edits happen in succession.
          schedule();
          return;
        }
        autoPushInFlightRef.current = true;
        void (async () => {
          try {
            await flushDriveWrite({ silent: true });
            lastAutoPushAtRef.current = Date.now();
          } catch (e) {
            const msg =
              e instanceof LabsGoogleInteractiveAuthRequiredError
                ? 'Drive sync paused. Sign in again to back up edits to Drive.'
                : e instanceof DriveHttpError
                  ? e.message
                  : e instanceof Error
                    ? e.message
                    : 'Drive auto-push failed.';
            setMessage(msg);
          } finally {
            autoPushInFlightRef.current = false;
          }
        })();
      }, STANZA_DRIVE_AUTO_PUSH_DEBOUNCE_MS);
    };

    // Dexie's hook fires for any create/update/delete on `songs`. We skip:
    //   - The very first call (initial library load shouldn't trigger an immediate push).
    //   - Anything happening while a Drive→local merge is in flight (those are echoes of data
    //     we just pulled; pushing them back is wasted bandwidth and risks racing).
    let primed = false;
    const onChange = () => {
      if (stanzaDriveMergeInProgress) return;
      if (!primed) {
        primed = true;
        return;
      }
      schedule();
    };
    stanzaDb.songs.hook('creating', onChange);
    stanzaDb.songs.hook('updating', onChange);
    stanzaDb.songs.hook('deleting', onChange);
    return () => {
      cancelled = true;
      if (autoPushTimerRef.current != null) {
        window.clearTimeout(autoPushTimerRef.current);
        autoPushTimerRef.current = null;
      }
      stanzaDb.songs.hook('creating').unsubscribe(onChange);
      stanzaDb.songs.hook('updating').unsubscribe(onChange);
      stanzaDb.songs.hook('deleting').unsubscribe(onChange);
    };
  }, [testerResolved, testerOk, flushDriveWrite, allowAutoPush]);

  const retryPullFromDrive = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      const msg =
        e instanceof LabsGoogleInteractiveAuthRequiredError
          ? 'Drive sync paused. Sign in again to pull the latest from Drive.'
          : e instanceof DriveHttpError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Drive pull failed.';
      setMessage(msg);
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
    message:
      syncPaused && !message
        ? 'Drive sync paused — sign in or retry pull before edits sync to Drive.'
        : message,
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
