import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { mergeGestureCollections } from '../drive/gestureMergeCollections';
import { sanitizeDriveFolderSegment } from '../drive/gestureCollectionPaths';
import type { GesturePack } from '../types';

interface MergeCollectionsDialogProps {
  open: boolean;
  packs: [GesturePack, GesturePack];
  busy?: boolean;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
}

export default function MergeCollectionsDialog({
  open,
  packs,
  busy,
  onClose,
  onComplete,
  onError,
}: MergeCollectionsDialogProps): React.ReactElement {
  const [targetId, setTargetId] = useState(packs[0]?.id ?? '');
  const [subfolderName, setSubfolderName] = useState('');
  const [merging, setMerging] = useState(false);

  const sourcePack = packs.find((p) => p.id !== targetId) ?? packs[1];
  const targetPack = packs.find((p) => p.id === targetId) ?? packs[0];

  useEffect(() => {
    if (!open) return;
    setTargetId(packs[0]?.id ?? '');
  }, [open, packs]);

  useEffect(() => {
    if (!open || !sourcePack) return;
    setSubfolderName(sanitizeDriveFolderSegment(sourcePack.name));
  }, [open, sourcePack]);

  const handleMerge = useCallback(async () => {
    if (!sourcePack || !targetPack) return;
    setMerging(true);
    onError('');
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const result = await mergeGestureCollections(token, {
        targetPackId: targetPack.id,
        sourcePackId: sourcePack.id,
        subfolderName: subfolderName.trim() || sourcePack.name,
      });
      onComplete(
        `Merged into "${targetPack.name}" as folder "${result.subfolderName}" (${result.filesMoved} photo${result.filesMoved === 1 ? '' : 's'}).`,
      );
      onClose();
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Merge failed.');
      }
    } finally {
      setMerging(false);
    }
  }, [onClose, onComplete, onError, sourcePack, subfolderName, targetPack]);

  const disabled = busy || merging;

  return (
    <Dialog open={open} onClose={disabled ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Merge collections</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Photos from one collection move into a subfolder inside the other. The source collection is removed from the app.
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Keep as main collection</Typography>
          <RadioGroup
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {packs.map((pack) => (
              <FormControlLabel
                key={pack.id}
                value={pack.id}
                control={<Radio size="small" />}
                label={pack.name}
                disabled={disabled}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <TextField
          label="Subfolder name for merged photos"
          value={subfolderName}
          onChange={(e) => setSubfolderName(e.target.value)}
          fullWidth
          size="small"
          disabled={disabled}
          helperText={`Drive path: ${targetPack?.name ?? '…'}/${subfolderName || '…'}/…`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={disabled}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleMerge()} disabled={disabled}>
          Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
}
