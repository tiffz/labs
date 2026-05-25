import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { formatLabsDriveInstant } from './formatLabsDriveInstant';
import type { LabsDriveBackupUiProps } from './labsDriveBackupTypes';

type LabsDriveRestoreDialogProps = Pick<
  LabsDriveBackupUiProps,
  | 'restoreOpen'
  | 'closeRestorePicker'
  | 'busy'
  | 'testerOk'
  | 'restoreFromDrive'
  | 'driveRestoreOption'
  | 'lastBackupExportedAt'
  | 'undoSnapshots'
  | 'applyUndoSnapshot'
  | 'undoLastSync'
  | 'canUndoLastSync'
  | 'copy'
>;

export default function LabsDriveRestoreDialog(props: LabsDriveRestoreDialogProps) {
  const {
    restoreOpen,
    closeRestorePicker,
    busy,
    testerOk,
    restoreFromDrive,
    driveRestoreOption,
    lastBackupExportedAt,
    undoSnapshots,
    applyUndoSnapshot,
    undoLastSync,
    canUndoLastSync,
    copy,
  } = props;

  return (
    <Dialog open={restoreOpen} onClose={() => !busy && closeRestorePicker()} fullWidth maxWidth="xs">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {copy.intro}
        </Typography>

        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'text.disabled', letterSpacing: '0.08em', mb: 0.5 }}
        >
          Google Drive
        </Typography>
        <List dense disablePadding sx={{ mb: undoSnapshots.length > 0 ? 1.5 : 0 }}>
          <ListItemButton disabled={busy || !testerOk} onClick={() => void restoreFromDrive()}>
            <ListItemText
              primary="Latest backup from Drive"
              secondary={
                driveRestoreOption
                  ? `${formatLabsDriveInstant(driveRestoreOption.exportedAt)}${
                      driveRestoreOption.secondary ? ` · ${driveRestoreOption.secondary}` : ''
                    }`
                  : lastBackupExportedAt
                    ? `Last seen ${formatLabsDriveInstant(lastBackupExportedAt)} · tap to refresh`
                    : 'Tap to fetch from Drive'
              }
            />
          </ListItemButton>
        </List>

        {undoSnapshots.length > 0 ? (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="overline"
              sx={{ display: 'block', color: 'text.disabled', letterSpacing: '0.08em', mb: 0.5 }}
            >
              Local snapshots (this browser)
            </Typography>
            <List dense disablePadding>
              {undoSnapshots.map((s) => (
                <ListItemButton key={s.key} disabled={busy} onClick={() => void applyUndoSnapshot(s)}>
                  <ListItemText primary={s.label} secondary={s.secondary ?? 'Local pre-backup snapshot'} />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : null}

        {canUndoLastSync && undoLastSync ? (
          <>
            <Divider sx={{ my: 1 }} />
            <List dense disablePadding>
              <ListItemButton disabled={busy} onClick={() => void undoLastSync()}>
                <ListItemText
                  primary="Undo last sync"
                  secondary="Restore the library snapshot from before the most recent Drive sync on this browser."
                />
              </ListItemButton>
            </List>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeRestorePicker} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
