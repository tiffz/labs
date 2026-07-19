import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useState, type ReactElement } from 'react';
import { useEncoreRepertoirePlaylist } from '../../context/EncoreRepertoirePlaylistContext';
import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../../theme/encoreUiTokens';

export type LibraryRepertoireSavedSearchesBarProps = {
  onSaveCurrentView: (name: string) => void;
  saveDialogOpen: boolean;
  onSaveDialogClose: () => void;
};

export function LibraryRepertoireSavedSearchesBar(props: LibraryRepertoireSavedSearchesBarProps): ReactElement {
  const { onSaveCurrentView, saveDialogOpen, onSaveDialogClose } = props;

  const { clientIdConfigured, syncError, dismissSyncError } = useEncoreRepertoirePlaylist();

  const [saveName, setSaveName] = useState('');

  const handleSaveDialogExited = useCallback(() => setSaveName(''), []);

  return (
    <>
      {syncError || !clientIdConfigured ? (
        <Box sx={{ mb: 2 }}>
          <Stack spacing={1.25}>
            {syncError ? (
              <Alert severity="warning" onClose={dismissSyncError} sx={{ py: 0.5 }}>
                {syncError}
              </Alert>
            ) : null}

            {!clientIdConfigured ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Set <code>VITE_SPOTIFY_CLIENT_ID</code> to link saved searches with Spotify playlists.
              </Alert>
            ) : null}
          </Stack>
        </Box>
      ) : null}
      <Dialog
        open={saveDialogOpen}
        onClose={onSaveDialogClose}
        fullWidth
        maxWidth="xs"
        slotProps={{
          transition: { onExited: handleSaveDialogExited }
        }}
      >
        <DialogTitle sx={encoreDialogTitleSx}>Save current search</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1.5,
              lineHeight: 1.5
            }}>
            Stores your search text, filters, and which filter rows are visible. Attach a Spotify playlist and keep it in sync
            from <strong>Saved searches → Manage saved searches</strong>.
          </Typography>
          <TextField
            label="Name"
            fullWidth
            size="small"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Musicals set · performed"
          />
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={onSaveDialogClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!saveName.trim()}
            onClick={() => {
              onSaveCurrentView(saveName.trim());
              onSaveDialogClose();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
