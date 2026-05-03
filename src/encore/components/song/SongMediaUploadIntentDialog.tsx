import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../../theme/encoreUiTokens';
import {
  SONG_MEDIA_UPLOAD_SLOTS,
  type SongMediaUploadSlot,
  SONG_MEDIA_UPLOAD_SLOT_LABEL,
} from './songMediaUploadSlot';

export function SongMediaUploadIntentDialog(props: {
  open: boolean;
  files: File[];
  onClose: () => void;
  onChoose: (slot: SongMediaUploadSlot) => void;
}): ReactElement {
  const { open, files, onClose, onChoose } = props;
  const names = files.map((f) => f.name).join(', ');
  const preview = names.length > 120 ? `${names.slice(0, 117)}…` : names;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={encoreDialogTitleSx}>Add file to this song</DialogTitle>
      <DialogContent sx={encoreDialogContentSx}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Drop was not on Listen, Play, Charts, or Takes. Choose where this should go.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, wordBreak: 'break-word' }}>
          {preview}
        </Typography>
        <Stack spacing={1}>
          {SONG_MEDIA_UPLOAD_SLOTS.map((slot) => (
            <Button
              key={slot}
              variant="outlined"
              color="inherit"
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.25 }}
              onClick={() => {
                onChoose(slot);
                onClose();
              }}
            >
              {SONG_MEDIA_UPLOAD_SLOT_LABEL[slot]}
            </Button>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
