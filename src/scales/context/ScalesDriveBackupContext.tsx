/* eslint-disable react-refresh/only-export-components -- hook + provider share one Drive backup module */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_SCALES,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import type { LabsAccountBackupSlotProps } from '../../shared/google/LabsAccountMenu';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import { getLabsDriveTesterHashesFromEnv, isEmailAllowedLabsDriveTester } from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import {
  buildScalesDriveEnvelope,
  parseScalesDriveEnvelope,
  serializeScalesDriveEnvelope,
} from '../drive/scalesDriveEnvelope';
import { readScalesDriveSyncMeta, writeScalesDriveSyncMeta } from '../drive/scalesDriveSyncMeta';
import type { ScalesProgressData } from '../progress/types';
import { useScales } from '../store';

type CloudRestorePrompt = {
  exportedAt: string;
  cloudModifiedTime: string;
  payload: ScalesProgressData;
};

export type ScalesDriveBackupContextValue = {
  googleClientConfigured: boolean;
  backupSlot: LabsAccountBackupSlotProps;
  cloudRestorePrompt: CloudRestorePrompt | null;
  dismissRestore: () => void;
  applyRestore: () => void;
};

const ScalesDriveBackupContext = createContext<ScalesDriveBackupContextValue | null>(null);

export function useScalesDriveBackupContext(): ScalesDriveBackupContextValue {
  const v = useContext(ScalesDriveBackupContext);
  if (!v) {
    throw new Error('useScalesDriveBackupContext must be used within ScalesDriveBackupProvider');
  }
  return v;
}

function scalesGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export function ScalesDriveBackupProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useScales();
  const identity = useLabsEncoreGoogleIdentity();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cloudRestorePrompt, setCloudRestorePrompt] = useState<CloudRestorePrompt | null>(null);

  const allowlistEmpty = getLabsDriveTesterHashesFromEnv().size === 0;

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

  const googleConfigured = scalesGoogleClientConfigured();
  const showForCloudChecks = googleConfigured && Boolean(identity?.email) && testerOk;

  const checkCloudNewer = useCallback(async () => {
    if (!showForCloudChecks) return;
    try {
      // Background auto-check: never open a popup (per ADR 0011). If the persisted token has
      // expired, `ensureLabsGoogleAccessTokenForDrive` throws `LabsGoogleInteractiveAuthRequiredError`
      // and we bail silently — the user's next manual Back up / Sign in click refreshes auth.
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
      const cloudMeta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const json = await readLabsDriveProgressJson(token, refs.progressFileId);
      let env;
      try {
        env = parseScalesDriveEnvelope(json);
      } catch {
        return;
      }
      const localMeta = readScalesDriveSyncMeta();
      const cloudM = cloudMeta.modifiedTime ?? '';
      const prevM = localMeta.lastCloudModifiedTime ?? '';
      const cloudNewerThanSeen = Boolean(cloudM && (!prevM || cloudM > prevM));
      const exported = env.exportedAt;
      const prevExported = localMeta.lastBackupExportedAt ?? '';
      const dataNewer = Boolean(exported && (!prevExported || exported > prevExported));
      if (cloudNewerThanSeen && dataNewer) {
        setCloudRestorePrompt({
          exportedAt: exported,
          cloudModifiedTime: cloudM,
          payload: env.payload,
        });
      }
    } catch {
      /* silent */
    }
  }, [showForCloudChecks]);

  useEffect(() => {
    if (!showForCloudChecks) return;
    void checkCloudNewer();
  }, [showForCloudChecks, checkCloudNewer]);

  const onBackup = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive();
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      const envelope = buildScalesDriveEnvelope(state.progress);
      const body = serializeScalesDriveEnvelope(envelope);
      await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
      const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      writeScalesDriveSyncMeta({
        lastCloudModifiedTime: metaAfter.modifiedTime,
        lastBackupExportedAt: envelope.exportedAt,
      });
      setMessage('Progress saved to Google Drive.');
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
  }, [state.progress]);

  const applyRestore = useCallback(() => {
    if (!cloudRestorePrompt) return;
    const { payload, exportedAt } = cloudRestorePrompt;
    dispatch({ type: 'REPLACE_PROGRESS_FROM_CLOUD', progress: payload });
    void (async () => {
      try {
        const token = await ensureLabsGoogleAccessTokenForDrive();
        const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
        const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
        writeScalesDriveSyncMeta({
          lastCloudModifiedTime: metaAfter.modifiedTime,
          lastBackupExportedAt: exportedAt,
        });
      } catch {
        writeScalesDriveSyncMeta({
          lastBackupExportedAt: exportedAt,
        });
      }
    })();
    setCloudRestorePrompt(null);
    setMessage('Restored progress from Drive.');
  }, [cloudRestorePrompt, dispatch]);

  const dismissRestore = useCallback(() => {
    if (cloudRestorePrompt) {
      writeScalesDriveSyncMeta({
        ...readScalesDriveSyncMeta(),
        lastCloudModifiedTime: cloudRestorePrompt.cloudModifiedTime,
      });
    }
    setCloudRestorePrompt(null);
  }, [cloudRestorePrompt]);

  const backupSlot = useMemo((): LabsAccountBackupSlotProps => {
    const meta = readScalesDriveSyncMeta();
    return {
      identity: identity?.email ? { email: identity.email } : null,
      testerResolved,
      testerOk,
      allowlistEmpty,
      busy,
      message,
      onBackup,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      scopeSummary: 'Practice progress JSON · drive.file',
    };
  }, [identity?.email, testerResolved, testerOk, allowlistEmpty, busy, message, onBackup]);

  const value = useMemo(
    (): ScalesDriveBackupContextValue => ({
      googleClientConfigured: googleConfigured,
      backupSlot,
      cloudRestorePrompt,
      dismissRestore,
      applyRestore,
    }),
    [googleConfigured, backupSlot, cloudRestorePrompt, dismissRestore, applyRestore],
  );

  return <ScalesDriveBackupContext.Provider value={value}>{children}</ScalesDriveBackupContext.Provider>;
}
