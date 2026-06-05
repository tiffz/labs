import type { SxProps, Theme } from '@mui/material/styles';
import { LabsAccountMenu, type LabsAccountMenuProps } from './LabsAccountMenu';
import LabsDriveBackupActionRow from './LabsDriveBackupActionRow';
import LabsDriveConflictDialog from './LabsDriveConflictDialog';
import LabsDriveRestoreDialog from './LabsDriveRestoreDialog';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from './labsDriveBackupUiTypes';

export type LabsDriveAccountMenuProps = Omit<LabsAccountMenuProps, 'renderBackupButton'> & {
  drive: LabsDriveBackupUiProps;
  /** When set, renders the shared merge/replace conflict dialog. */
  conflict?: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
  /** Override the default backup + restore + Drive link row (e.g. Stanza soft-outline button). */
  renderBackupButton?: LabsAccountMenuProps['renderBackupButton'];
  backupActionVariant?: 'google-outlined' | 'contained';
  googleButtonClassName?: string;
  googleButtonSx?: SxProps<Theme>;
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
    ...menuProps
  } = props;

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
      <LabsAccountMenu {...menuProps} renderBackupButton={renderBackupButton ?? defaultBackupRow} />
      <LabsDriveRestoreDialog {...drive} />
      {conflict ? <LabsDriveConflictDialog open {...conflict} /> : null}
    </>
  );
}
