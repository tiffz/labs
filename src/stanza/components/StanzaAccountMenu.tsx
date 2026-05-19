import { useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from '../../shared/google/labsDriveBackupTypes';
import {
  stanzaDriveTesterAllowlistEmpty,
  stanzaGoogleClientConfigured,
  useStanzaDriveBackup,
} from '../hooks/useStanzaDriveBackup';

export default function StanzaAccountMenu() {
  const backup = useStanzaDriveBackup();

  const drive = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    return {
      driveFolderUrl: backup.driveFolderUrl,
      driveFolderAriaLabel: 'Open Stanza folder in Google Drive (opens in new tab)',
      canRestore: backup.canRestore,
      restoreOpen: backup.restoreOpen,
      openRestorePicker: backup.openRestorePicker,
      closeRestorePicker: backup.closeRestorePicker,
      busy: backup.busy,
      testerOk: backup.testerOk,
      restoreFromDrive: backup.restoreLatestFromDrive,
      driveRestoreOption: backup.latestRemoteEnvelope
        ? {
            exportedAt: backup.latestRemoteEnvelope.exportedAt,
            secondary: `${backup.latestRemoteEnvelope.songs.length} song${
              backup.latestRemoteEnvelope.songs.length === 1 ? '' : 's'
            }`,
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => ({
        key: String(s.createdAt),
        label: s.label,
      })),
      applyUndoSnapshot: (item) => {
        const snap = backup.undoSnapshots.find((s) => String(s.createdAt) === item.key);
        if (snap) void backup.applyUndoSnapshot(snap);
      },
      copy: {
        title: 'Restore library',
        intro:
          'Merges metadata into this library. Newer updatedAt wins per song; local audio is kept when ids match.',
      },
    };
  }, [backup]);

  const conflict = useMemo((): (LabsDriveConflictUiProps & { dialogTitleId: string }) | null => {
    if (!backup.conflict) return null;
    const c = backup.conflict;
    return {
      dialogTitleId: 'stanza-drive-conflict-title',
      busy: backup.busy,
      title: 'Drive backup conflict',
      intro: (
        <>
          Another device may have uploaded a newer <code>progress.json</code> to your Stanza folder on Drive than
          this browser last saw.
        </>
      ),
      stats: [
        { label: 'Drive file modified:', value: c.driveModifiedTime || 'unknown' },
        { label: 'Backup timestamp inside file:', value: c.remoteExportedAt },
        {
          label: 'Songs in Drive backup / on this device:',
          value: `${c.remoteSongCount} / ${c.localSongCount}`,
        },
      ],
      explainLines: c.explainLines,
      mergeBullet:
        'Merge, then upload. For each song id, keep the copy with the newer updatedAt. When Drive wins, this device keeps local audio files where ids still match. The combined library is then uploaded to Drive.',
      replaceBullet:
        "Replace Drive only. Uploads this device's library as-is and overwrites the Drive file. Use when Drive is wrong or empty.",
      cancelBullet:
        'Cancel. Nothing is written. A snapshot of this device was saved when you opened this dialog; use Restore if you merge and change your mind.',
      onCancel: backup.cancelConflict,
      onReplaceOnly: backup.confirmReplaceDriveOnly,
      onMergeThenUpload: backup.confirmMergeThenUpload,
    };
  }, [backup]);

  if (!stanzaGoogleClientConfigured()) return null;

  const meta = backup.lastMeta;
  const googleButtonSx: SxProps<Theme> = {
    borderColor: 'rgba(60, 60, 67, 0.22)',
    bgcolor: 'rgba(255, 253, 250, 0.98)',
    color: 'text.primary',
    '&:hover': { bgcolor: 'rgba(255, 253, 250, 1)', borderColor: 'rgba(60, 60, 67, 0.28)' },
  };

  return (
    <LabsDriveAccountMenu
      appId="stanza"
      googleClientConfigured
      identityCaption="Remembered from Encore on this browser. Opening a Drive recording may ask for Google permission again."
      backup={{
        identity: backup.identity?.email ? { email: backup.identity.email } : null,
        testerResolved: backup.testerResolved,
        testerOk: backup.testerOk,
        allowlistEmpty: stanzaDriveTesterAllowlistEmpty(),
        busy: backup.busy,
        message: backup.message,
        onBackup: backup.onBackup,
        lastBackupExportedAt: meta.lastBackupExportedAt,
        scopeSummary: 'Sections, BPM, mix, and skip flags. Audio stays on device.',
        scopeTooltip:
          'Metadata syncs to a Stanza folder on Drive. Recordings and mix layers stay on each device (drive.file).',
      }}
      drive={drive}
      conflict={conflict}
      ids={{ menu: 'stanza-account-menu', button: 'stanza-account-menu-button' }}
      appearance={{
        menuPaperClassName: 'stanza-panel',
        menuPaperSx: {
          maxWidth: 'min(100vw - 24px, 320px)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.1)',
        },
        tooltipTitle: 'Account and Drive backup',
        iconButtonSx: {
          borderColor: 'rgba(60, 60, 67, 0.18)',
          bgcolor: 'rgba(255, 253, 250, 0.85)',
          '&:hover': {
            bgcolor: 'rgba(255, 253, 250, 0.98)',
            borderColor: 'rgba(232, 72, 160, 0.35)',
          },
        },
      }}
      backupActionVariant="google-outlined"
      googleButtonClassName="stanza-btn-soft-outline"
      googleButtonSx={googleButtonSx}
    />
  );
}
