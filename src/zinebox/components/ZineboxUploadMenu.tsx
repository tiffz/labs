import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useCallback, useState } from 'react';

import DriveFolderImportDialog from './DriveFolderImportDialog';
import ZineboxLibraryAddPanel from './ZineboxLibraryAddPanel';

type DriveReviewSession = {
  folderInput: string;
  accessToken: string;
};

type ZineboxUploadMenuProps = {
  disabled?: boolean;
  tagSuggestions: readonly string[];
  onLocalFiles: (files: File[]) => void;
  onDriveImportComplete?: (summary: string) => void;
  onError: (message: string | null) => void;
};

export default function ZineboxUploadMenu({
  disabled = false,
  tagSuggestions,
  onLocalFiles,
  onDriveImportComplete,
  onError,
}: ZineboxUploadMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [driveReview, setDriveReview] = useState<DriveReviewSession | null>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleLocalFiles = useCallback(
    (files: File[]) => {
      onLocalFiles(files);
      setOpen(false);
    },
    [onLocalFiles],
  );

  const handleDriveImportComplete = useCallback(
    (summary: string) => {
      onDriveImportComplete?.(summary);
      setOpen(false);
      setDriveReview(null);
    },
    [onDriveImportComplete],
  );

  const handleOpenDriveReview = useCallback(
    (session: DriveReviewSession) => {
      setDriveReview(session);
      setOpen(false);
    },
    [],
  );

  const handleDriveReviewClose = useCallback(() => {
    setDriveReview(null);
  }, []);

  return (
    <>
      <Button
        size="small"
        variant="contained"
        startIcon={<CloudUploadOutlinedIcon />}
        disabled={disabled}
        onClick={() => setOpen(true)}
        sx={{ textTransform: 'none', flexShrink: 0 }}
      >
        Upload zines
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="zinebox-upload-dialog-title"
      >
        <DialogTitle id="zinebox-upload-dialog-title">Upload zines</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.45 }}>
            Add PDFs from your device or import a Google Drive folder. You can also drop PDFs anywhere on the
            library page.
          </Typography>
          <ZineboxLibraryAddPanel
            disabled={disabled}
            onLocalFiles={handleLocalFiles}
            onOpenDriveReview={handleOpenDriveReview}
            onError={onError}
          />
        </DialogContent>
      </Dialog>

      <DriveFolderImportDialog
        open={driveReview != null}
        folderInput={driveReview?.folderInput ?? ''}
        accessToken={driveReview?.accessToken ?? null}
        tagSuggestions={tagSuggestions}
        onClose={handleDriveReviewClose}
        onComplete={handleDriveImportComplete}
        onError={onError}
      />
    </>
  );
}
