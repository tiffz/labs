import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { createPerformanceVideoShortcut } from '../drive/performanceShortcut';
import type { EncorePerformance } from '../types';

function newPerformance(songId: string): EncorePerformance {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  return {
    id: crypto.randomUUID(),
    songId,
    date: day,
    venueTag: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function PerformanceEditorDialog(props: {
  open: boolean;
  performance: EncorePerformance | null;
  songId: string;
  googleAccessToken: string | null;
  onClose: () => void;
  onSave: (p: EncorePerformance) => Promise<void>;
}): React.ReactElement {
  const { open, performance, songId, googleAccessToken, onClose, onSave } = props;
  const [draft, setDraft] = useState<EncorePerformance>(newPerformance(songId));
  const [shortcutMsg, setShortcutMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(performance ? { ...performance } : newPerformance(songId));
      setShortcutMsg(null);
    }
  }, [open, performance, songId]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    let videoShortcutDriveFileId = draft.videoShortcutDriveFileId;
    const target = draft.videoTargetDriveFileId?.trim();
    if (target && googleAccessToken && !videoShortcutDriveFileId) {
      try {
        const name = `Performance ${draft.date} ${draft.venueTag || 'video'}`.slice(0, 120);
        videoShortcutDriveFileId = await createPerformanceVideoShortcut(googleAccessToken, target, name);
        setShortcutMsg('Created a shortcut in your Encore_App/Performances folder.');
      } catch (e) {
        setShortcutMsg(
          `Shortcut not created (${e instanceof Error ? e.message : String(e)}). Performance will still be saved.`
        );
      }
    }
    await onSave({
      ...draft,
      venueTag: draft.venueTag.trim() || 'Venue',
      date: draft.date,
      videoTargetDriveFileId: target || undefined,
      videoShortcutDriveFileId,
      externalVideoUrl: draft.externalVideoUrl?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="perf-editor-title">
      <DialogTitle id="perf-editor-title">{performance ? 'Edit performance' : 'Log performance'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Date"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Venue tag"
            value={draft.venueTag}
            onChange={(e) => setDraft((d) => ({ ...d, venueTag: e.target.value }))}
            placeholder="Martuni's, Living Room, …"
            fullWidth
          />
          <TextField
            label="Video file ID in Drive (optional)"
            value={draft.videoTargetDriveFileId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, videoTargetDriveFileId: e.target.value || undefined }))}
            fullWidth
            helperText="Encore can drop a shortcut into Encore_App/Performances when you are signed in."
          />
          <TextField
            label="External video link (optional)"
            value={draft.externalVideoUrl ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, externalVideoUrl: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="Notes"
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
            fullWidth
            multiline
            minRows={2}
          />
          {shortcutMsg && (
            <Typography variant="caption" color="text.secondary">
              {shortcutMsg}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
