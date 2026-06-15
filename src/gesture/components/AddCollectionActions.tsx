import { useCallback, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { GESTURE_REFERENCE_IMAGE_ACCEPT } from '../drive/gestureDriveConstants';
import { inferLocalFolderName } from '../drive/gestureLocalFolderUpload';
import { supportsDirectoryPicker } from '../drive/gestureFolderPicker';
import { linkPackFolderFromInput } from '../drive/linkPackFolder';
import MultiFolderUploadDialog from './MultiFolderUploadDialog';
import type { GestureUploadFileBatch } from '../drive/gestureLocalFolderUpload';
import type { GestureCollectionUploadHandle } from '../hooks/useGestureCollectionUpload';
interface AddCollectionActionsProps {
  disabled?: boolean;
  variant?: 'primary' | 'subtle';
  upload: GestureCollectionUploadHandle;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
}

export default function AddCollectionActions({
  disabled,
  variant = 'primary',
  upload,
  onComplete,
  onError,
}: AddCollectionActionsProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [multiFolderOpen, setMultiFolderOpen] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const { uploadFiles, uploadFolderBatches } = upload;

  const handleFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? [...e.target.files] : [];
      e.target.value = '';
      if (list.length > 0) void uploadFiles(list);
    },
    [uploadFiles],
  );

  const handleFolder = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? [...e.target.files] : [];
      e.target.value = '';
      if (list.length === 0) return;
      void uploadFiles(list, inferLocalFolderName(list));
    },
    [uploadFiles],
  );

  const handleLink = useCallback(async () => {
    if (!folderInput.trim()) return;
    onError('');
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const result = await linkPackFolderFromInput(token, folderInput);
      setFolderInput('');
      setLinkOpen(false);
      onComplete(`Linked ${result.imageCount} photo${result.imageCount === 1 ? '' : 's'}.`);
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not link folder.');
      }
    }
  }, [folderInput, onComplete, onError]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={GESTURE_REFERENCE_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={handleFiles}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleFolder}
      />

      <Button
        variant={variant === 'primary' ? 'contained' : 'outlined'}
        startIcon={<AddIcon />}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        disabled={disabled}
        className={variant === 'subtle' ? 'gesture-add-btn-subtle' : undefined}
      >
        Add
      </Button>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            folderInputRef.current?.click();
          }}
        >
          Upload folder
        </MenuItem>
        {supportsDirectoryPicker() ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setMultiFolderOpen(true);
            }}
          >
            Upload folders…
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            fileInputRef.current?.click();
          }}
        >
          Upload photos
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setLinkOpen(true);
          }}
        >
          Link Drive folder
        </MenuItem>
      </Menu>

      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="gesture-link-dialog-title"
      >
        <DialogTitle id="gesture-link-dialog-title">Link a Drive folder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Photos must sit directly in the folder. Subfolders are not scanned.
          </Typography>
          <TextField
            label="Folder link or id"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://drive.google.com/drive/folders/…"
            disabled={disabled}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkOpen(false)} disabled={disabled}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleLink()} disabled={disabled || !folderInput.trim()}>
            Link
          </Button>
        </DialogActions>
      </Dialog>

      <MultiFolderUploadDialog
        open={multiFolderOpen}
        disabled={disabled}
        onClose={() => setMultiFolderOpen(false)}
        onUpload={(batches: GestureUploadFileBatch[]) => uploadFolderBatches(batches)}
        onError={onError}
      />
    </>
  );
}
