import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { SyncCheckResult } from '../drive/repertoireSync';

export function ConflictResolutionDialog(props: {
  open: boolean;
  conflict: SyncCheckResult | null;
  onUseRemote: () => void;
  onKeepLocal: () => void;
  onDismiss: () => void;
}): React.ReactElement {
  const { open, conflict, onUseRemote, onKeepLocal, onDismiss } = props;
  return (
    <Dialog open={open} onClose={onDismiss} aria-labelledby="encore-conflict-title">
      <DialogTitle id="encore-conflict-title">Sync conflict</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Encore found changes both on this device and in your Google Drive file. Pick how to resolve this one-time
          merge.
        </Typography>
        {conflict?.remoteModified && (
          <Typography variant="caption" color="text.secondary" display="block">
            Drive file last modified: {new Date(conflict.remoteModified).toLocaleString()}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, py: 1.5 }}>
        <Button onClick={onDismiss} color="inherit">
          Decide later
        </Button>
        <Button onClick={onUseRemote} variant="contained" color="secondary">
          Use Drive copy
        </Button>
        <Button onClick={onKeepLocal} variant="contained">
          Keep this device
        </Button>
      </DialogActions>
    </Dialog>
  );
}
