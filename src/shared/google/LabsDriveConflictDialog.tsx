import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { LabsDriveConflictUiProps } from './labsDriveBackupUiTypes';

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
    detail,
    recommendation,
    replaceWarning,
    mergeButtonLabel = 'Merge and upload',
    replaceButtonLabel = 'Use this device only',
    onCancel,
    onReplaceOnly,
    onMergeThenUpload,
  } = props;

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onCancel()}
      fullWidth
      maxWidth="xs"
      aria-labelledby={dialogTitleId}
    >
      <DialogTitle id={dialogTitleId} sx={{ pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
          {intro}
        </Typography>
        {detail ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 1,
              lineHeight: 1.45
            }}>
            {detail}
          </Typography>
        ) : null}
        {recommendation ? (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            {recommendation}
          </Alert>
        ) : null}
        {replaceWarning ? (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
            {replaceWarning}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 3, pb: 2.5, pt: 0 }}>
        <Button variant="contained" fullWidth onClick={() => void onMergeThenUpload()} disabled={busy}>
          {mergeButtonLabel}
        </Button>
        <Button fullWidth onClick={() => void onReplaceOnly()} disabled={busy} color="warning">
          {replaceButtonLabel}
        </Button>
        <Button fullWidth onClick={onCancel} disabled={busy} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
