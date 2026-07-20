import { useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsPortfolioConflictReviewDialog from '../../shared/google/LabsPortfolioConflictReviewDialog';
import type { LabsDriveBackupUiProps } from '../../shared/google/labsDriveBackupUiTypes';
import { stanzaGoogleClientConfigured, useStanzaDriveBackup } from '../hooks/useStanzaDriveBackup';
import { formatStanzaDriveUndoSnapshotTrigger, parseSnapshotEnvelope } from '../drive/stanzaDriveUndoSnapshots';
import { summarizeEnvelopeSections } from '../drive/stanzaDriveMarkerSummary';
import { stanzaDriveLastBackupDisplayIso } from '../drive/stanzaDriveSyncMeta';

export default function StanzaAccountMenu() {
  const backup = useStanzaDriveBackup();
  const lastBackupDisplayIso = useMemo(
    () => stanzaDriveLastBackupDisplayIso(backup.lastMeta),
    [backup.lastMeta],
  );

  const drive = useMemo((): LabsDriveBackupUiProps => {
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
      lastBackupExportedAt: lastBackupDisplayIso,
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
      historyRecovery: backup.historyRecovery
        ? {
            entityNoun: backup.historyRecovery.entityNoun,
            historyRecoverOpen: backup.historyRecovery.historyRecoverOpen,
            openHistoryRecover: backup.historyRecovery.openHistoryRecover,
            closeHistoryRecover: backup.historyRecovery.closeHistoryRecover,
            scanHistoryForRecovery: backup.historyRecovery.scanHistoryForRecovery,
            restoreFromHistory: backup.historyRecovery.restoreFromHistory,
          }
        : undefined,
      copy: {
        title: 'Restore library',
        intro:
          'Merges metadata into this library. Section markers are kept when one copy has sections and the other does not. Linked recordings re-download from Drive when missing on this device.',
      },
    };
  }, [backup, lastBackupDisplayIso]);

  if (!stanzaGoogleClientConfigured()) return null;

  const googleButtonSx: SxProps<Theme> = {
    borderColor: 'rgba(60, 60, 67, 0.22)',
    bgcolor: 'rgba(255, 253, 250, 0.98)',
    color: 'text.primary',
    '&:hover': { bgcolor: 'rgba(255, 253, 250, 1)', borderColor: 'rgba(60, 60, 67, 0.28)' },
  };

  const conflict = backup.conflict;

  return (
    <>
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
          lastBackupExportedAt: lastBackupDisplayIso,
          scopeSummary:
            'Sections, BPM, mix layers, and skip flags. Uploaded recordings and mix audio sync to Drive.',
          scopeTooltip:
            'Metadata and linked audio sync to a Stanza folder on Drive (progress.json, main_audio/, stem_audio/). Re-download happens when you open a song on another device.',
        }}
        drive={drive}
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
      {conflict ? (
        <LabsPortfolioConflictReviewDialog
          open
          dialogTitleId="stanza-drive-conflict-title"
          analysis={conflict.analysis}
          busy={backup.busy}
          mergeFootnote="Section markers and practice settings from both copies are kept when they do not conflict."
          helpTooltip="Stanza stores your library in this browser and backs it up to Google Drive. When both sides edit the same song and automatic merge would lose sections or practice settings, you pick which version to keep. Edits on different songs merge silently."
          onApply={(choices) => void backup.resolveConflictWithChoices(choices)}
          onDismiss={backup.cancelConflict}
        />
      ) : null}
      {backup.confirmRestoreSnapshotDialog}
    </>
  );
}
