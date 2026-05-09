import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { LabsAccountMenu } from '../../shared/google/LabsAccountMenu';
import { useScalesDriveBackupContext } from '../context/ScalesDriveBackupContext';

export default function ScalesAccountMenu() {
  const { googleClientConfigured, backupSlot } = useScalesDriveBackupContext();

  if (!googleClientConfigured) return null;

  return (
    <LabsAccountMenu
      appId="scales"
      googleClientConfigured={googleClientConfigured}
      backup={backupSlot}
      ids={{ menu: 'scales-account-menu', button: 'scales-account-menu-button' }}
      appearance={{
        tooltipTitle: 'Account & Drive backup',
        menuPaperSx: {
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
        iconButtonSx: {
          '&:hover': {
            bgcolor: (theme) => `${theme.palette.primary.main}14`,
            color: 'primary.main',
          },
        },
      }}
      renderBackupButton={({ disabled, busy, onBackup }) => (
        <Button
          variant="contained"
          size="small"
          disabled={disabled}
          onClick={onBackup}
          aria-label="Back up progress to Google Drive"
          startIcon={busy ? <CircularProgress size={14} color="inherit" aria-hidden /> : undefined}
        >
          {busy ? 'Saving…' : 'Back up to Drive'}
        </Button>
      )}
    />
  );
}
