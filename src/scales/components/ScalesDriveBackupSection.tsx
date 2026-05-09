import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useScalesDriveBackupContext } from '../context/ScalesDriveBackupContext';

/**
 * Cloud-restore prompt only. Backup UI lives in {@link ScalesAccountMenu}.
 */
export default function ScalesDriveBackupSection() {
  const { cloudRestorePrompt, dismissRestore, applyRestore } = useScalesDriveBackupContext();

  return (
    <Dialog
      open={cloudRestorePrompt !== null}
      onClose={dismissRestore}
      aria-labelledby="scales-restore-title"
    >
      <DialogTitle id="scales-restore-title">Newer progress on Drive</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          A backup from {cloudRestorePrompt?.exportedAt ?? ''} looks newer than what this browser last synced. Replace
          local progress with the cloud copy?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={dismissRestore}>Keep local</Button>
        <Button variant="contained" onClick={applyRestore} disabled={!cloudRestorePrompt}>
          Replace with cloud
        </Button>
      </DialogActions>
    </Dialog>
  );
}
