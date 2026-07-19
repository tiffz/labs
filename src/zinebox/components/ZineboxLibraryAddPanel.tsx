import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useCallback, useState } from 'react';

import { DragDropFileUpload } from '../../shared/components/DragDropFileUpload';
import AppTooltip from '../../shared/components/AppTooltip';
import { LabsDriveFolderPasteOrBrowseBlock } from '../../shared/drive/LabsDriveFolderPasteOrBrowseBlock';
import { ensureZineboxGoogleDriveAccess } from '../drive/zineboxGoogleDriveAccess';
import { LabsGoogleInteractiveAuthRequiredError } from '../../shared/google/labsGoogleDriveAccess';
import { useZineboxGoogleAccessToken } from '../hooks/useZineboxGoogleAccessToken';

type ZineboxLibraryAddPanelProps = {
  disabled?: boolean;
  onLocalFiles: (files: File[]) => void;
  onError: (message: string | null) => void;
  /** Parent opens Drive review (and typically closes the upload dialog). */
  onOpenDriveReview: (opts: { folderInput: string; accessToken: string }) => void;
};

const PDF_ACCEPT = 'application/pdf,.pdf';

export default function ZineboxLibraryAddPanel({
  disabled = false,
  onLocalFiles,
  onError,
  onOpenDriveReview,
}: ZineboxLibraryAddPanelProps): React.ReactElement {
  const googleAccessToken = useZineboxGoogleAccessToken();
  const [folderInput, setFolderInput] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const openDriveReview = useCallback(async () => {
    if (!folderInput.trim()) {
      onError('Paste a Google Drive folder link or id.');
      return;
    }
    onError(null);
    setReviewBusy(true);
    try {
      const token = await ensureZineboxGoogleDriveAccess({
        interactive: true,
        upgradeScopes: true,
      });
      onOpenDriveReview({ folderInput: folderInput.trim(), accessToken: token });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError('Sign in with Google first (Account menu, top right).');
      } else {
        onError(e instanceof Error ? e.message : 'Google sign-in did not finish.');
      }
    } finally {
      setReviewBusy(false);
    }
  }, [folderInput, onOpenDriveReview, onError]);

  const interactionDisabled = disabled || reviewBusy;

  return (
    <div className="zinebox-upload-zone zinebox-library-add-panel" data-testid="zinebox-upload-zone">
      <DragDropFileUpload
        accept={PDF_ACCEPT}
        multiple
        disabled={interactionDisabled}
        tone="neutral"
        label="Add PDF zines"
        helperText="Drop PDFs here or click to browse. Files stay on this device after import."
        ariaLabel="Add PDF zines from your device"
        onFiles={onLocalFiles}
        sx={{
          minHeight: 160,
          borderRadius: '8px',
          borderStyle: 'dashed',
          borderWidth: '1px',
          borderColor: 'var(--zinebox-border)',
          bgcolor: 'var(--zinebox-surface)',
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600
          }}>
          OR
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
      </Box>
      <LabsDriveFolderPasteOrBrowseBlock
        value={folderInput}
        onChange={(v) => {
          setFolderInput(v);
          onError(null);
        }}
        googleAccessToken={googleAccessToken}
        disabled={interactionDisabled}
        description={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Typography
              variant="body2"
              component="span"
              sx={{
                color: "text.secondary",
                lineHeight: 1.45
              }}>
              Already have zines in Drive? Paste a folder link.
            </Typography>
            <AppTooltip title="Large folders (like a full Shortbox drop) open a review step so you can tag everything at once.">
              <IconButton
                size="small"
                aria-label="About Drive folder import"
                sx={{ mt: -0.5, color: 'text.secondary', p: 0.25 }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </AppTooltip>
          </Box>
        }
        primaryAction={
          <Button
            size="small"
            variant="contained"
            onClick={() => void openDriveReview()}
            disabled={interactionDisabled || !folderInput.trim()}
          >
            {reviewBusy ? 'Signing in…' : 'Review import'}
          </Button>
        }
      />
    </div>
  );
}
