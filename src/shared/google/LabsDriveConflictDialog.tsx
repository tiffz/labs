import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { LabsDriveConflictUiProps } from './labsDriveBackupTypes';

type LabsDriveConflictDialogProps = LabsDriveConflictUiProps & {
  open: boolean;
  dialogTitleId: string;
};

export default function LabsDriveConflictDialog(props: LabsDriveConflictDialogProps) {
  const {
    open,
    dialogTitleId,
    busy,
    title,
    intro,
    stats,
    explainLines,
    mergeBullet,
    replaceBullet,
    cancelBullet,
    onCancel,
    onReplaceOnly,
    onMergeThenUpload,
  } = props;

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onCancel()}
      fullWidth
      maxWidth="sm"
      aria-labelledby={dialogTitleId}
    >
      <DialogTitle id={dialogTitleId}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {intro}
        </Typography>
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {stats.map((row) => (
            <Typography key={row.label} variant="body2">
              <strong>{row.label}</strong> {row.value}
            </Typography>
          ))}
        </Stack>
        {explainLines.map((line, i) => (
          <Typography key={i} variant="body2" sx={{ mb: 1 }}>
            {line}
          </Typography>
        ))}
        <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
          How to decide
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ marginTop: 0, paddingLeft: '1.25rem' }}>
            <li>{mergeBullet}</li>
            <li>{replaceBullet}</li>
            <li>{cancelBullet}</li>
          </ul>
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void onReplaceOnly()} disabled={busy} color="warning">
          Replace Drive only
        </Button>
        <Button variant="contained" onClick={() => void onMergeThenUpload()} disabled={busy}>
          Merge, then upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
