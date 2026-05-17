import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { useEncore } from '../context/EncoreContext';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import { navigateEncore } from '../routes/encoreAppHash';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { NewSongDraftForm } from './song/NewSongDraftForm';
import {
  draftToEncoreSong,
  EMPTY_NEW_SONG_DRAFT,
  isNewSongDraftSubmittable,
  type NewSongDraft,
} from './song/newSongDraft';

/**
 * Minimal "Add song" flow:
 *  - If Spotify is connected, type to search and pick a track. Title, artist, and
 *    album art come from the Spotify result.
 *  - Otherwise (or to override the Spotify result), enter title + artist by hand.
 *
 * After submit we save the song locally and open its song page so the user can
 * fill in performance key, milestones, attachments, etc. there.
 *
 * The Practice screen's "Add to practice" dialog reuses the same field layout (via
 * {@link NewSongDraftForm}) but stays on the Practice screen after save instead of
 * navigating away — see {@link AddToPracticeDialog}.
 */
export function AddSongDialog(props: { open: boolean; onClose: () => void }): React.ReactElement {
  const { open, onClose } = props;
  const { saveSong, repertoireExtras } = useEncore();

  const [draft, setDraft] = useState<NewSongDraft>(EMPTY_NEW_SONG_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY_NEW_SONG_DRAFT);
    setError(null);
  }, [open]);

  const canSubmit = isNewSongDraftSubmittable(draft) && !saving;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const synced = applyTemplateProgressToSong(
        draftToEncoreSong(draft),
        repertoireExtras.milestoneTemplate,
      );
      await saveSong(synced);
      onClose();
      // Open the song page so the user can fill in the rest at their leisure.
      navigateEncore({ kind: 'song', id: synced.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [canSubmit, draft, onClose, repertoireExtras.milestoneTemplate, saveSong]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-song-title"
      slotProps={{ paper: { sx: { overflow: 'visible' } } }}
    >
      <DialogTitle id="add-song-title" sx={encoreDialogTitleSx}>
        Add song
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          /* Outlined TextField labels extend above the input; DialogContent’s default overflow clips them. */
          overflow: 'visible',
          pt: 3,
        }}
      >
        <NewSongDraftForm
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={submit}
          autoFocusOnMount={open}
        />
        {error ? (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} variant="contained" disabled={!canSubmit}>
          {saving ? 'Adding…' : 'Add song'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
