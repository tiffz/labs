import { useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import { labsDriveSyncMessageIsTransientSuccess } from '../drive/labsDriveSyncMessages';
import {
  LabsAccountMenu,
  type LabsAccountBackupSlotProps,
  type LabsAccountMenuProps,
} from './LabsAccountMenu';
import LabsDriveBackupActionRow from './LabsDriveBackupActionRow';
import LabsDriveConflictDialog from './LabsDriveConflictDialog';
import LabsDriveRestoreDialog from './LabsDriveRestoreDialog';
import { LabsPortfolioDriveHistoryRecoverDialog } from './LabsPortfolioDriveHistoryRecoverDialog';
import LabsDriveSyncToast from './LabsDriveSyncToast';
import { useLabsDriveSyncToastMessage } from './useLabsDriveSyncToastMessage';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from './labsDriveBackupUiTypes';

export type LabsDriveAccountMenuProps = Omit<LabsAccountMenuProps, 'renderBackupButton'> & {
  /** Required here: the Drive menu exists to render the backup block. */
  backup: LabsAccountBackupSlotProps;
  drive: LabsDriveBackupUiProps;
  /** When set, renders the shared merge/replace conflict dialog. */
  conflict?: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
  /** Override the default backup + restore + Drive link row (e.g. Stanza soft-outline button). */
  renderBackupButton?: LabsAccountMenuProps['renderBackupButton'];
  backupActionVariant?: 'google-outlined' | 'contained';
  googleButtonClassName?: string;
  googleButtonSx?: SxProps<Theme>;
  /** App shell renders {@link LabsFeedbackToast} (e.g. Zine Box sticky header). */
  hideSyncToast?: boolean;
};

/**
 * Account menu with shared Google Drive backup UX: back up, restore picker, Open in Drive,
 * and optional conflict dialog. Apps supply {@link LabsDriveBackupUiProps} from their hook/context.
 */
export function LabsDriveAccountMenu(props: LabsDriveAccountMenuProps) {
  const {
    drive,
    conflict,
    renderBackupButton,
    backupActionVariant = 'contained',
    googleButtonClassName,
    googleButtonSx,
    backup,
    hideSyncToast = false,
    ...menuProps
  } = props;

  const { toastMessage, clearToast } = useLabsDriveSyncToastMessage(backup.message, backup.onDismissMessage);

  const backupForMenu = useMemo(
    () => ({
      ...backup,
      message:
        backup.message && labsDriveSyncMessageIsTransientSuccess(backup.message)
          ? null
          : backup.message,
    }),
    [backup],
  );

  const defaultBackupRow = ({
    disabled,
    busy,
    onBackup,
    needsSignIn,
    onSignIn,
  }: {
    disabled: boolean;
    busy: boolean;
    onBackup: () => void;
    needsSignIn: boolean;
    onSignIn: () => void;
  }) => (
    <LabsDriveBackupActionRow
      disabled={disabled}
      busy={busy}
      onBackup={onBackup}
      needsSignIn={needsSignIn}
      onSignIn={onSignIn}
      canRestore={drive.canRestore}
      onOpenRestore={drive.openRestorePicker}
      driveFolderUrl={drive.driveFolderUrl}
      driveFolderAriaLabel={drive.driveFolderAriaLabel}
      backupAriaLabel="Back up to Google Drive"
      variant={backupActionVariant}
      googleButtonClassName={googleButtonClassName}
      googleButtonSx={googleButtonSx}
    />
  );

  return (
    <>
      <LabsAccountMenu
        {...menuProps}
        backup={backupForMenu}
        renderBackupButton={renderBackupButton ?? defaultBackupRow}
      />
      <LabsDriveRestoreDialog {...drive} />
      {drive.historyRecovery ? (
        <LabsPortfolioDriveHistoryRecoverDialog
          open={drive.historyRecovery.historyRecoverOpen}
          onClose={drive.historyRecovery.closeHistoryRecover}
          busy={drive.busy}
          entityNoun={drive.historyRecovery.entityNoun}
          scanHistory={drive.historyRecovery.scanHistoryForRecovery}
          restoreSelected={drive.historyRecovery.restoreFromHistory}
        />
      ) : null}
      {conflict ? <LabsDriveConflictDialog open {...conflict} /> : null}
      {hideSyncToast ? null : (
        <LabsDriveSyncToast message={toastMessage} onClose={clearToast} />
      )}
    </>
  );
}
