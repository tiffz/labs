import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState, type ReactElement } from 'react';

import { createVisualDevAsset } from '../db/lyreflyProjectMutations';
import { buildConceptShelfCreateInput } from '../utils/conceptShelfUtils';

export const BRAINSTORM_RESOURCE_FILE_ACCEPT =
  'image/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/*,.mp3,.m4a,.wav,.webm,.aac,.flac,.ogg';

export type BrainstormResourceDialogProps = {
  projectId: string;
  open: boolean;
  onClose: () => void;
};

export function BrainstormResourceDialog({
  projectId,
  open,
  onClose,
}: BrainstormResourceDialogProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const resetDialog = (): void => {
    setLinkUrl('');
    setLinkLabel('');
    setLinkNotes('');
    setPendingFile(null);
  };

  const closeDialog = (): void => {
    onClose();
    resetDialog();
  };

  const submitReference = async (): Promise<void> => {
    const input = buildConceptShelfCreateInput(linkUrl, linkLabel, linkNotes, pendingFile ?? undefined);
    if (!input) return;
    try {
      await createVisualDevAsset(projectId, input);
      closeDialog();
    } catch {
      /* Dexie errors surface via app shell; keep dialog open for retry */
    }
  };

  const canSubmitReference = Boolean(linkUrl.trim() || linkNotes.trim() || pendingFile);

  return (
    <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
      <DialogTitle>Add to the board</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={BRAINSTORM_RESOURCE_FILE_ACCEPT}
              onChange={(ev) => {
                const file = ev.target.files?.[0] ?? null;
                ev.target.value = '';
                setPendingFile(file);
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AttachFileOutlinedIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: 'none' }}
            >
              {pendingFile ? pendingFile.name : 'Attach file'}
            </Button>
            {pendingFile ? (
              <Button size="small" onClick={() => setPendingFile(null)} sx={{ ml: 0.5, textTransform: 'none' }}>
                Remove
              </Button>
            ) : null}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 0.75
              }}>
              PDFs, docs, text files, Drive links, or images
            </Typography>
          </Box>
          <TextField
            label="URL (optional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://… or Google Drive / Docs link"
            fullWidth
          />
          <TextField
            label="Label (optional)"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            fullWidth
          />
          <TextField
            label="Note (optional)"
            value={linkNotes}
            onChange={(e) => setLinkNotes(e.target.value)}
            placeholder="Why this helps, tone, beats…"
            multiline
            minRows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>Cancel</Button>
        <Button variant="contained" onClick={() => void submitReference()} disabled={!canSubmitReference}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
