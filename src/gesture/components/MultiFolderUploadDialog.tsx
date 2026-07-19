import { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { pickLocalFolder, supportsDirectoryPicker } from '../drive/gestureFolderPicker';
import { inferLocalFolderName } from '../drive/gestureLocalFolderUpload';
import type { GestureUploadFileBatch } from '../drive/gestureLocalFolderUpload';

interface MultiFolderUploadDialogProps {
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
  onUpload: (batches: GestureUploadFileBatch[]) => void;
  onError: (message: string) => void;
}

export default function MultiFolderUploadDialog({
  open,
  disabled,
  onClose,
  onUpload,
  onError,
}: MultiFolderUploadDialogProps): React.ReactElement {
  const [queued, setQueued] = useState<GestureUploadFileBatch[]>([]);
  const [picking, setPicking] = useState(false);

  const resetAndClose = useCallback(() => {
    setQueued([]);
    onClose();
  }, [onClose]);

  const addFolder = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      onError('Your browser does not support picking multiple folders. Drop folders on Collections instead.');
      return;
    }
    setPicking(true);
    onError('');
    try {
      const picked = await pickLocalFolder();
      if (!picked || picked.files.length === 0) return;
      const name = inferLocalFolderName(picked.files) ?? picked.folderName;
      setQueued((prev) => [
        ...prev,
        { files: picked.files, suggestedFolderName: name, directoryHandle: picked.handle },
      ]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      onError(e instanceof Error ? e.message : 'Could not read folder.');
    } finally {
      setPicking(false);
    }
  }, [onError]);

  const handleUpload = useCallback(() => {
    if (queued.length === 0) return;
    onUpload(queued);
    setQueued([]);
    onClose();
  }, [onClose, onUpload, queued]);

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="xs" aria-labelledby="gesture-multi-folder-title">
      <DialogTitle id="gesture-multi-folder-title">Upload folders</DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          Add one or more folders. Each becomes its own collection. Nested subfolders stay organized on Drive.
        </Typography>
        {queued.length > 0 ? (
          <List dense disablePadding>
            {queued.map((batch) => (
              <ListItem key={batch.suggestedFolderName ?? batch.files[0]?.name} disableGutters>
                <ListItemText
                  primary={batch.suggestedFolderName ?? 'Folder'}
                  secondary={`${batch.files.length} file${batch.files.length === 1 ? '' : 's'}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No folders added yet.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={resetAndClose} disabled={disabled || picking}>
          Cancel
        </Button>
        <Button onClick={() => void addFolder()} disabled={disabled || picking}>
          Add folder
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={disabled || picking || queued.length === 0}
        >
          Upload {queued.length > 0 ? queued.length : ''} folder{queued.length === 1 ? '' : 's'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
