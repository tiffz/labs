import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsDriveBackupActionRow from '../../shared/google/LabsDriveBackupActionRow';
import { useZineboxDriveBackupContext } from '../context/ZineboxDriveBackupContext';

export default function ZineboxAccountMenu(): React.ReactElement | null {
  const { googleClientConfigured, backupSlot, driveUi, conflict } = useZineboxDriveBackupContext();

  if (!googleClientConfigured) return null;

  return (
    <LabsDriveAccountMenu
      appId="zinebox"
      googleClientConfigured={googleClientConfigured}
      backup={backupSlot}
      drive={driveUi}
      conflict={conflict}
      ids={{ menu: 'zinebox-account-menu', button: 'zinebox-account-menu-button' }}
      appearance={{
        tooltipTitle: 'Account and Drive backup',
        menuPaperClassName: 'zinebox-account-menu',
      }}
      renderBackupButton={(ctx) => (
        <LabsDriveBackupActionRow
          disabled={ctx.disabled}
          busy={ctx.busy}
          onBackup={ctx.onBackup}
          needsSignIn={ctx.needsSignIn}
          onSignIn={ctx.onSignIn}
          canRestore={driveUi.canRestore}
          onOpenRestore={driveUi.openRestorePicker}
          driveFolderUrl={driveUi.driveFolderUrl}
          driveFolderAriaLabel={driveUi.driveFolderAriaLabel}
          backupAriaLabel="Back up to Google Drive"
        />
      )}
    />
  );
}
