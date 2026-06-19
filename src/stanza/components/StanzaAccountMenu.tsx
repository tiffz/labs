import { useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatLabsDriveInstant } from '../../shared/google/formatLabsDriveInstant';
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from '../../shared/google/labsDriveBackupUiTypes';
import { stanzaGoogleClientConfigured, useStanzaDriveBackup } from '../hooks/useStanzaDriveBackup';
import { formatStanzaDriveUndoSnapshotTrigger, parseSnapshotEnvelope } from '../drive/stanzaDriveUndoSnapshots';
import { summarizeEnvelopeSections } from '../drive/stanzaDriveMarkerSummary';

export default function StanzaAccountMenu() {
  const backup = useStanzaDriveBackup();

  const drive = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    const driveSummary = backup.latestRemoteEnvelope
      ? summarizeEnvelopeSections(backup.latestRemoteEnvelope.songs)
      : null;
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
            secondary: `${driveSummary?.songCount ?? backup.latestRemoteEnvelope.songs.length} song${
              (driveSummary?.songCount ?? backup.latestRemoteEnvelope.songs.length) === 1 ? '' : 's'
            } · ${driveSummary?.sectionCount ?? 0} section${(driveSummary?.sectionCount ?? 0) === 1 ? '' : 's'}`,
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => {
        let secondary = formatStanzaDriveUndoSnapshotTrigger(s.trigger);
        try {
          const env = parseSnapshotEnvelope(s);
          const sum = summarizeEnvelopeSections(env.songs);
          secondary = `${sum.songCount} song${sum.songCount === 1 ? '' : 's'} · ${sum.sectionCount} section${sum.sectionCount === 1 ? '' : 's'} · ${secondary}`;
        } catch {
          /* ignore parse errors in list */
        }
        return {
          key: String(s.createdAt),
          label: s.label,
          secondary,
        };
      }),
      applyUndoSnapshot: (item) => {
        const snap = backup.undoSnapshots.find((s) => String(s.createdAt) === item.key);
        if (snap) void backup.applyUndoSnapshot(snap);
      },
      undoLastSync: backup.restoreLatestPrePullSnapshot,
      canUndoLastSync: backup.canUndoLastSync,
      copy: {
        title: 'Restore library',
        intro:
          'Merges metadata into this library. Section markers are kept when one copy has sections and the other does not. Local audio stays on device.',
      },
    };
  }, [backup]);

  const conflict = useMemo((): (LabsDriveConflictUiProps & { dialogTitleId: string }) | null => {
    if (!backup.conflict) return null;
    const c = backup.conflict;
    const firstDeviceHere = c.reasons.includes('drive_nonempty_first_device');
    const driveUpdatedAt = c.driveModifiedTime || c.remoteExportedAt;
    const driveWhen = driveUpdatedAt ? formatLabsDriveInstant(driveUpdatedAt) : null;
    const songCountLine = `${c.remoteSongCount} song${c.remoteSongCount === 1 ? '' : 's'} on Drive · ${c.localSongCount} here`;
    const localRicher = c.localSongsWithMoreMarkers;
    const remoteSections = c.remoteSectionCount;
    const localSections = c.localSectionCount;
    let recommendation = firstDeviceHere
      ? 'Merge and upload is usually safest so you keep songs from both copies.'
      : 'Merge and upload is usually safest so you keep edits from both copies.';
    if (localRicher > 0) {
      recommendation = `This device has sections for ${localRicher} song${localRicher === 1 ? '' : 's'} that Drive does not. Merge keeps your sections.`;
    }
    const replaceWarning =
      remoteSections > localSections
        ? `Drive has more section markers overall (${remoteSections} vs ${localSections} here). Use this device only if you mean to replace Drive with this copy.`
        : undefined;
    return {
      dialogTitleId: 'stanza-drive-conflict-title',
      busy: backup.busy,
      title: 'Drive backup conflict',
      intro: firstDeviceHere
        ? 'Drive already has a Stanza backup, but this device has not synced here before.'
        : 'Your Stanza library was updated on another device since this browser last synced.',
      detail: driveWhen ? `${songCountLine} · Drive updated ${driveWhen}` : songCountLine,
      recommendation,
      replaceWarning,
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
        allowlistEmpty: getLabsDriveBackupRestrictionHashesFromEnv().size === 0,
        busy: backup.busy,
        message: backup.message,
        onDismissMessage: backup.dismissMessage,
        onBackup: backup.onBackup,
        onSignIn: backup.onSignIn,
        lastBackupExportedAt: meta.lastBackupExportedAt,
        scopeSummary:
          'Sections, BPM, mix, and skip flags. Drive recordings re-download when you open them.',
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