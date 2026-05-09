import { useCallback, useEffect, useState } from 'react';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_STANZA,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import {
  getLabsDriveTesterHashesFromEnv,
  isEmailAllowedLabsDriveTester,
} from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import { buildStanzaDriveEnvelope, serializeStanzaDriveEnvelope } from '../drive/stanzaDriveEnvelope';
import { readStanzaDriveSyncMeta, writeStanzaDriveSyncMeta } from '../drive/stanzaDriveSyncMeta';

export function stanzaGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export function stanzaDriveTesterAllowlistEmpty(): boolean {
  return getLabsDriveTesterHashesFromEnv().size === 0;
}

export function useStanzaDriveBackup() {
  const identity = useLabsEncoreGoogleIdentity();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastMeta = readStanzaDriveSyncMeta();

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

  const onBackup = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
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
  }, []);

  return {
    identity,
    testerOk,
    testerResolved,
    busy,
    message,
    onBackup,
    lastMeta,
  };
}
