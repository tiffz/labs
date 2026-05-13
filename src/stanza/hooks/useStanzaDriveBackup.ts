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

import { useCallback, useEffect, useState } from 'react';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_STANZA,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import {
  getLabsDriveTesterHashesFromEnv,
  isEmailAllowedLabsDriveTester,
} from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';
import { assessStanzaDriveBackupConflict } from '../drive/stanzaDriveConflict';
import {
  buildStanzaDriveEnvelope,
  parseStanzaDriveEnvelope,
  serializeStanzaDriveEnvelope,
  type StanzaDriveEnvelopeV1,
} from '../drive/stanzaDriveEnvelope';
import { formatStanzaDriveMergeReport, mergeDriveRowsIntoLocalLibrary } from '../drive/stanzaDriveMerge';
import { readStanzaDriveSyncMeta, writeStanzaDriveSyncMeta } from '../drive/stanzaDriveSyncMeta';
import {
  listStanzaDriveUndoSnapshots,
  parseSnapshotEnvelope,
  pushStanzaDriveUndoSnapshot,
  type StanzaDriveUndoSnapshot,
} from '../drive/stanzaDriveUndoSnapshots';

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
  explainLines: string[];
  remoteEnvelope: StanzaDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

async function persistMergedSongs(nextRows: StanzaSong[]): Promise<void> {
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
}

export function useStanzaDriveBackup() {
  const identity = useLabsEncoreGoogleIdentity();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<StanzaDriveBackupConflictState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

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

  const flushDriveWrite = useCallback(async () => {
    const token = await ensureLabsGoogleAccessTokenForDrive();
    const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_STANZA);
    const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    const envelope = await buildStanzaDriveEnvelope();
    const body = serializeStanzaDriveEnvelope(envelope);
    await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
    const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    writeStanzaDriveSyncMeta({
      lastCloudModifiedTime: metaAfter.modifiedTime,
      lastBackupExportedAt: envelope.exportedAt,
    });
    setMessage('Library metadata saved to Google Drive (audio stays on this device).');
  }, []);

  const onBackup = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive();
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_STANZA);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const localRows = await stanzaDb.songs.toArray();
      const localEnvelope = await buildStanzaDriveEnvelope();
      pushStanzaDriveUndoSnapshot(localEnvelope);

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
          explainLines: assessment.explainLines,
          remoteEnvelope,
          etag: metaBefore.etag,
          progressFileId: refs.progressFileId,
        });
        return;
      }

      await flushDriveWrite();
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
  }, [flushDriveWrite]);

  const cancelConflict = useCallback(() => {
    setConflict(null);
  }, []);

  const confirmReplaceDriveOnly = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      await flushDriveWrite();
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
  }, [conflict, flushDriveWrite]);

  const confirmMergeThenUpload = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      const localRows = await stanzaDb.songs.toArray();
      const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(localRows, conflict.remoteEnvelope.songs);
      await persistMergedSongs(nextRows);
      setMessage(`Merged library (${formatStanzaDriveMergeReport(report)}), then saved to Drive.`);
      setConflict(null);
      await flushDriveWrite();
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
  }, [conflict, flushDriveWrite]);

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
        const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(localRows, env.songs);
        await persistMergedSongs(nextRows);
        setRestoreOpen(false);
        setMessage(`Restored snapshot from ${snap.label}. ${formatStanzaDriveMergeReport(report)}`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Restore failed.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    identity,
    testerOk,
    testerResolved,
    busy,
    message,
    onBackup,
    lastMeta: readStanzaDriveSyncMeta(),
    conflict,
    cancelConflict,
    confirmMergeThenUpload,
    confirmReplaceDriveOnly,
    restoreOpen,
    openRestorePicker,
    closeRestorePicker,
    undoSnapshots: listStanzaDriveUndoSnapshots(),
    applyUndoSnapshot,
  };
}
