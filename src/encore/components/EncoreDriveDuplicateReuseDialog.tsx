import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import type { EncoreDriveContentIndexEntry } from '../drive/encoreDriveContentIndex';

export type EncoreDriveDuplicateReuseDialogProps = {
  open: boolean;
  fileName: string;
  entry: EncoreDriveContentIndexEntry | null;
  onReuse: () => void;
  onUploadAnyway: () => void;
  onCancel: () => void;
};

export function EncoreDriveDuplicateReuseDialog({
  open,
  fileName,
  entry,
  onReuse,
  onUploadAnyway,
  onCancel,
}: EncoreDriveDuplicateReuseDialogProps): ReactElement {
  const refs = entry?.sampleLabels ?? [];
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Duplicate file?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>{fileName}</strong> looks like a file Encore already has in Google Drive as{' '}
          <strong>{entry?.name ?? 'another upload'}</strong>.
        </Typography>
        {refs.length > 0 ? (
          <>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 0.5
              }}>
              Used in:
            </Typography>
            <List dense disablePadding sx={{ mb: 1 }}>
              {refs.map((label) => (
                <ListItem key={label} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText primary={label} slotProps={{
                    primary: { variant: 'body2' }
                  }} />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Reuse the existing file to avoid another copy in Drive, or upload anyway if you need a separate file.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onUploadAnyway}>Upload anyway</Button>
        <Button variant="contained" onClick={onReuse}>
          Use existing file
        </Button>
      </DialogActions>
    </Dialog>
  );
}
