import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { StanzaSong } from '../../db/stanzaDb';
import { STANZA_STEM_DURATION_MATCH_EPS_SEC } from '../../utils/probeFileAudioDuration';

/** Pending OS drop: length matched current track. user must confirm stem import. */
export type StanzaStemDropConfirm = {
  songId: string;
  files: File[];
  rows: { name: string; durationSec: number }[];
  refSec: number;
  hasYoutube: boolean;
};

type StanzaWorkspaceDialogsProps = {
  libraryMenuAnchor: HTMLElement | null;
  onCloseLibraryMenu: () => void;
  onRequestRemoveFromLibrary: () => void;
  removeConfirmSong: StanzaSong | null;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  stemDropConfirm: StanzaStemDropConfirm | null;
  onCancelStemDrop: () => void;
  onStemDropNewSong: () => void;
  onStemDropAddLayers: () => void;
  onStemDropSwitchToUpload: () => void;
  onStemDropReplaceYoutube: () => void;
};

/** Library context menu, remove-from-library confirm, and matched-file stem-drop dialogs. */
export default function StanzaWorkspaceDialogs({
  libraryMenuAnchor,
  onCloseLibraryMenu,
  onRequestRemoveFromLibrary,
  removeConfirmSong,
  onCancelRemove,
  onConfirmRemove,
  stemDropConfirm,
  onCancelStemDrop,
  onStemDropNewSong,
  onStemDropAddLayers,
  onStemDropSwitchToUpload,
  onStemDropReplaceYoutube,
}: StanzaWorkspaceDialogsProps) {
  return (
    <>
      <Menu
        anchorEl={libraryMenuAnchor}
        open={Boolean(libraryMenuAnchor)}
        onClose={onCloseLibraryMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={onRequestRemoveFromLibrary}>Remove from library…</MenuItem>
      </Menu>

      <Dialog open={removeConfirmSong != null} onClose={onCancelRemove} aria-labelledby="stanza-remove-title">
        <DialogTitle id="stanza-remove-title">Remove from library?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This removes “{removeConfirmSong?.title ?? ''}” from your library and deletes all practice data for it on
            this device: markers and sections, focus-time stats, and per-section metronome calibration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelRemove}>Cancel</Button>
          <Button color="error" variant="text" onClick={onConfirmRemove}>
            Remove from library
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={stemDropConfirm != null}
        onClose={onCancelStemDrop}
        aria-labelledby="stanza-stem-drop-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="stanza-stem-drop-title">
          {stemDropConfirm?.hasYoutube ? 'How should this file be used?' : 'Add as mix layers?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            {stemDropConfirm?.hasYoutube
              ? `This file matches your track (${stemDropConfirm.refSec.toFixed(
                  1,
                )} s). Add it as a mix layer, switch practice to the upload, or replace the YouTube video. Your sections stay on this song.`
              : stemDropConfirm
                ? `Each file is about the same length as the loaded track (${stemDropConfirm.refSec.toFixed(
                    1,
                  )} s, within ±${STANZA_STEM_DURATION_MATCH_EPS_SEC.toFixed(2)} s). That usually means an alternate mix (for example, an instrumental).`
                : null}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Matched files
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2.25, py: 0 }} role="list">
            {stemDropConfirm?.rows.map((r, i) => (
              <Typography
                key={`${i}:${r.name}`}
                component="li"
                variant="body2"
                sx={{ mb: 0.5, wordBreak: 'break-word' }}
              >
                {r.name}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({r.durationSec.toFixed(1)} s)
                </Typography>
              </Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, py: 1.5 }}>
          <Button onClick={onCancelStemDrop}>Cancel</Button>
          <Button color="inherit" onClick={onStemDropNewSong}>
            New song instead
          </Button>
          {stemDropConfirm?.hasYoutube ? (
            <>
              <Button color="inherit" onClick={onStemDropAddLayers}>
                Add as mix layer
              </Button>
              <Button variant="contained" onClick={onStemDropSwitchToUpload}>
                Switch to uploaded file
              </Button>
              <Button color="inherit" onClick={onStemDropReplaceYoutube}>
                Replace YouTube with file
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={onStemDropAddLayers}>
              Add as layers
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
