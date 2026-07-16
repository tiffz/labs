import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { bulkSetSourceUrlOnPacks } from '../drive/bulkUpdatePackMetadata';

type BulkSetSourceDialogProps = {
  open: boolean;
  packCount: number;
  busy?: boolean;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
  packIds: string[];
};

export default function BulkSetSourceDialog({
  open,
  packCount,
  busy,
  onClose,
  onComplete,
  onError,
  packIds,
}: BulkSetSourceDialogProps): React.ReactElement {
  const [sourceUrl, setSourceUrl] = useState('');
  const [clearSource, setClearSource] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceUrl('');
    setClearSource(false);
    setSaving(false);
  }, [open]);

  const interactionDisabled = busy || saving;

  const handleClose = () => {
    if (!interactionDisabled) onClose();
  };

  const handleSave = useCallback(async () => {
    if (!clearSource && !sourceUrl.trim()) {
      onError('Enter a web address or choose Clear source on all.');
      return;
    }
    setSaving(true);
    onError('');
    try {
      await bulkSetSourceUrlOnPacks(packIds, clearSource ? null : sourceUrl.trim());
      onComplete(
        clearSource
          ? `Removed source link from ${packCount} collection${packCount === 1 ? '' : 's'}.`
          : `Updated source on ${packCount} collection${packCount === 1 ? '' : 's'}.`,
      );
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not update source.');
    } finally {
      setSaving(false);
    }
  }, [clearSource, onClose, onComplete, onError, packCount, packIds, sourceUrl]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" aria-labelledby="gesture-bulk-source-title">
      <DialogTitle id="gesture-bulk-source-title">Set source on {packCount} collections</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Applies the same source link to every selected collection.
        </Typography>
        <TextField
          label="Source link"
          placeholder="https://…"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          disabled={interactionDisabled || clearSource}
          fullWidth
          size="small"
          sx={{ mb: 1 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={clearSource}
              onChange={(e) => setClearSource(e.target.checked)}
              disabled={interactionDisabled}
            />
          }
          label="Clear source on all selected"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={interactionDisabled}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={interactionDisabled}>
          {saving ? 'Saving…' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
