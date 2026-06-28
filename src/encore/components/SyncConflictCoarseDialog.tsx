import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

export type SyncConflictCoarseDialogProps = {
  open: boolean;
  busy?: boolean;
  onUseDrive: () => void;
  onKeepLocal: () => void;
  onDismiss: () => void;
};

/** Fallback when row-level analysis is unavailable but both sides changed since last sync. */
export function SyncConflictCoarseDialog(props: SyncConflictCoarseDialogProps) {
  const { open, busy, onUseDrive, onKeepLocal, onDismiss } = props;
  return (
    <Dialog open={open} onClose={onDismiss} aria-labelledby="encore-coarse-conflict-title">
      <DialogTitle id="encore-coarse-conflict-title">Drive sync conflict</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          Your repertoire changed on this device and on Google Drive since the last sync. Choose which copy to keep for
          song details, or sign in again and retry sync.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mt: 1 }}>
          Either way, filled exercise answers from <strong>both</strong> copies are kept. This choice never deletes
          your written answers.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDismiss} disabled={busy}>
          Later
        </Button>
        <Button onClick={onKeepLocal} disabled={busy}>
          Keep this device
        </Button>
        <Button variant="contained" onClick={onUseDrive} disabled={busy}>
          Use Drive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
