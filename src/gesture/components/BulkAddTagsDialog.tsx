import { useCallback, useEffect, useMemo, useState } from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { bulkAddTagsToPacks } from '../drive/bulkUpdatePackMetadata';
import { normalizeGestureTags } from '../drive/gesturePackTags';
import { registerGestureLocalTags } from '../drive/gestureTagRegistry';

const filterTagOptions = createFilterOptions<string>({
  trim: true,
  matchFrom: 'start',
  ignoreCase: true,
  limit: 12,
});

type BulkAddTagsDialogProps = {
  open: boolean;
  packCount: number;
  allTags: string[];
  busy?: boolean;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
  packIds: string[];
};

export default function BulkAddTagsDialog({
  open,
  packCount,
  allTags,
  busy,
  onClose,
  onComplete,
  onError,
  packIds,
}: BulkAddTagsDialogProps): React.ReactElement {
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTags([]);
    setInputValue('');
    setSaving(false);
  }, [open]);

  const tagOptions = useMemo(() => {
    const chosen = new Set(tags.map((tag) => tag.toLowerCase()));
    return allTags.filter((tag) => !chosen.has(tag.toLowerCase()));
  }, [allTags, tags]);

  const interactionDisabled = busy || saving;

  const handleClose = () => {
    if (!interactionDisabled) onClose();
  };

  const handleSave = useCallback(async () => {
    const normalized = normalizeGestureTags([...tags, inputValue.trim()].filter(Boolean));
    if (normalized.length === 0) {
      onError('Add at least one tag.');
      return;
    }
    setSaving(true);
    onError('');
    try {
      registerGestureLocalTags(normalized);
      const updated = await bulkAddTagsToPacks(packIds, normalized);
      onComplete(
        updated > 0
          ? `Added tags to ${updated} collection${updated === 1 ? '' : 's'}.`
          : `Tags were already on all ${packCount} selected collections.`,
      );
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add tags.');
    } finally {
      setSaving(false);
    }
  }, [inputValue, onClose, onComplete, onError, packCount, packIds, tags]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" aria-labelledby="gesture-bulk-tags-title">
      <DialogTitle id="gesture-bulk-tags-title">Add tags to {packCount} collections</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Tags are added to each selected collection (existing tags stay).
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          options={tagOptions}
          value={tags}
          inputValue={inputValue}
          onChange={(_e, value) => setTags(normalizeGestureTags(value))}
          onInputChange={(_e, value) => setInputValue(value)}
          filterOptions={filterTagOptions}
          disabled={interactionDisabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags to add"
              placeholder="Type a tag and press Enter"
              size="small"
            />
          )}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={interactionDisabled}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={interactionDisabled}>
          {saving ? 'Saving…' : 'Add tags'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
