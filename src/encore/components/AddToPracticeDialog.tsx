import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import CheckIcon from '@mui/icons-material/Check';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme, type Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEncore } from '../context/EncoreContext';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { withPracticingToggle } from '../repertoire/practicingToggle';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import type { EncoreSong } from '../types';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import {
  buildPerfBySongMap,
  partitionAddToPracticeResults,
} from './practice/addToPracticeSearch';
import { NewSongDraftForm } from './song/NewSongDraftForm';
import {
  draftToEncoreSong,
  EMPTY_NEW_SONG_DRAFT,
  isNewSongDraftSubmittable,
  type NewSongDraft,
} from './song/newSongDraft';

export type AddToPracticeDialogProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Fired when a song is added (either an existing library song flipped to `practicing` or a
   * brand-new song created with `practicing: true`). The PracticeScreen uses this to focus the
   * song in the right pane and sync the URL.
   */
  onAdded: (song: EncoreSong) => void;
};

type Mode = 'search' | 'create';

/**
 * Unified "Add to practice" dialog. Two modes share one dialog instead of bouncing between two:
 *
 * - **Search mode** (default): TextField + library results, ranked alphabetically. Songs that
 *   are already practicing are split into a secondary section and act as "jump-to-focus"
 *   shortcuts rather than no-op adds. Search uses {@link songMatchesSearch} so behaviour
 *   matches the Library page exactly (title, artist, performance venue, key, tags).
 * - **Create mode**: reuses {@link NewSongDraftForm} (the same fields {@link AddSongDialog}
 *   uses), prefilled with the search query. On submit, the song is saved with
 *   `practicing: true` and the dialog closes — unlike `AddSongDialog`, we do NOT navigate to
 *   the song page, because the user explicitly came here to start practicing, not edit metadata.
 *
 * The mode toggle lives inside one dialog (rather than chaining two dialogs) so the user keeps
 * their typed search if they need to go back from create, and never sees a dialog-flicker.
 */
export function AddToPracticeDialog(props: AddToPracticeDialogProps): React.ReactElement {
  const { open, onClose, onAdded } = props;
  const theme = useTheme();
  const { songs, performances, saveSong, repertoireExtras } = useEncore();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('search');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<NewSongDraft>(EMPTY_NEW_SONG_DRAFT);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setMode('search');
    setBusyId(null);
    setCreateDraft(EMPTY_NEW_SONG_DRAFT);
    setCreateError(null);
  }, [open]);

  const perfBySong = useMemo(() => buildPerfBySongMap(performances), [performances]);

  const { available, alreadyPracticing } = useMemo(
    () => partitionAddToPracticeResults(songs, query, perfBySong),
    [songs, query, perfBySong],
  );

  const handlePickExisting = useCallback(
    async (song: EncoreSong) => {
      if (song.practicing) {
        // Already in the queue — treat as "jump to it" rather than a no-op save.
        onAdded(song);
        onClose();
        return;
      }
      setBusyId(song.id);
      try {
        // `withPracticingToggle` also clears any `practiceRemovedAt` tombstone so the Spotify
        // Learning Playlist sync won't immediately un-add this song on the next round-trip.
        const next = withPracticingToggle(song, true);
        await saveSong(next);
        onAdded(next);
        onClose();
      } finally {
        setBusyId(null);
      }
    },
    [onAdded, onClose, saveSong],
  );

  const enterCreateMode = useCallback(() => {
    setCreateDraft((d) => ({ ...d, title: d.title.trim() || query.trim() }));
    setCreateError(null);
    setMode('create');
  }, [query]);

  const exitCreateMode = useCallback(() => {
    setCreateError(null);
    setMode('search');
  }, []);

  const canSubmitCreate = isNewSongDraftSubmittable(createDraft) && !createSaving;

  const submitCreate = useCallback(async () => {
    if (!canSubmitCreate) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const now = new Date().toISOString();
      const baseSong = draftToEncoreSong(createDraft, now);
      // Route through `withPracticingToggle` for consistency with the pick-existing path. A
      // brand-new draft has no tombstone, so the no-op clear is harmless and any future copy /
      // template-based path that DOES carry one is auto-corrected.
      const synced: EncoreSong = applyTemplateProgressToSong(
        withPracticingToggle(baseSong, true, now),
        repertoireExtras.milestoneTemplate,
      );
      await saveSong(synced);
      onAdded(synced);
      onClose();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreateSaving(false);
    }
  }, [canSubmitCreate, createDraft, onAdded, onClose, repertoireExtras.milestoneTemplate, saveSong]);

  const trimmedQuery = query.trim();
  const hasAnyResults = available.length > 0 || alreadyPracticing.length > 0;
  const showCreateInlineCta = trimmedQuery.length > 0 && available.length === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-to-practice-title"
      slotProps={{ paper: { sx: { overflow: 'visible' } } }}
    >
      <DialogTitle id="add-to-practice-title" sx={encoreDialogTitleSx}>
        <Stack direction="row" spacing={1} alignItems="center">
          {mode === 'create' ? (
            <Tooltip title="Back to library search">
              <IconButton
                size="small"
                aria-label="Back to library search"
                onClick={exitCreateMode}
                sx={{ ml: -0.5 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Box component="span">{mode === 'create' ? 'Add a new song to practice' : 'Add to practice'}</Box>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          /* Outlined TextField labels and Spotify autocomplete dropdowns extend past the box. */
          overflow: 'visible',
          pt: 3,
        }}
      >
        {mode === 'search' ? (
          <Stack spacing={2}>
            <TextField
              size="small"
              fullWidth
              // Search-first dialog: opening implies intent to type, so focusing the input is the
              // expected UX (analogous to browser / IDE command palettes).
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, artist, venue, key, tag…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ 'aria-label': 'Search your library' }}
            />

            <List
              dense
              sx={{
                maxHeight: 360,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                py: 0,
              }}
            >
              {!hasAnyResults ? (
                <Box sx={{ px: 2, py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {songs.length === 0
                      ? 'Your library is empty. Add a song below to start practicing.'
                      : trimmedQuery.length > 0
                        ? 'No matching songs in your library.'
                        : 'Search your library by title, artist, venue, key, or tag.'}
                  </Typography>
                </Box>
              ) : (
                <>
                  {available.map((s) => (
                    <SongResultRow
                      key={s.id}
                      song={s}
                      mode="add"
                      busy={busyId === s.id}
                      onClick={() => void handlePickExisting(s)}
                      theme={theme}
                    />
                  ))}
                  {alreadyPracticing.length > 0 ? (
                    <ListSubheader
                      sx={{
                        typography: 'caption',
                        fontWeight: 700,
                        bgcolor: 'background.paper',
                        lineHeight: 2.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Already practicing
                    </ListSubheader>
                  ) : null}
                  {alreadyPracticing.map((s) => (
                    <SongResultRow
                      key={s.id}
                      song={s}
                      mode="already"
                      busy={false}
                      onClick={() => void handlePickExisting(s)}
                      theme={theme}
                    />
                  ))}
                </>
              )}
            </List>

            <Divider flexItem>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                {showCreateInlineCta ? 'or' : 'not in your library?'}
              </Typography>
            </Divider>

            <Button
              variant={showCreateInlineCta ? 'contained' : 'outlined'}
              startIcon={<AddIcon />}
              onClick={enterCreateMode}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
            >
              {trimmedQuery.length > 0
                ? `Add “${trimmedQuery}” as a new song`
                : 'Add a new song'}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <NewSongDraftForm
              draft={createDraft}
              onDraftChange={setCreateDraft}
              onSubmit={submitCreate}
              autoFocusOnMount
            />
            {createError ? (
              <Typography variant="caption" color="error" sx={{ lineHeight: 1.5 }}>
                {createError}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        {mode === 'search' ? (
          <Button onClick={onClose} color="inherit">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={exitCreateMode} color="inherit" disabled={createSaving}>
              Back
            </Button>
            <Button
              onClick={() => void submitCreate()}
              variant="contained"
              startIcon={<PlaylistAddOutlinedIcon />}
              disabled={!canSubmitCreate}
            >
              {createSaving ? 'Adding…' : 'Add to practice'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

type SongResultRowProps = {
  song: EncoreSong;
  mode: 'add' | 'already';
  busy: boolean;
  onClick: () => void;
  theme: Theme;
};

function SongResultRow({ song, mode, busy, onClick, theme }: SongResultRowProps): React.ReactElement {
  return (
    <ListItemButton
      onClick={onClick}
      disabled={busy}
      alignItems="flex-start"
      sx={{ py: 1, opacity: mode === 'already' ? 0.78 : 1 }}
    >
      <ListItemAvatar sx={{ minWidth: 52 }}>
        {song.albumArtUrl ? (
          <Box
            component="img"
            src={song.albumArtUrl}
            alt=""
            sx={{ width: 40, height: 40, borderRadius: 0.75, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              ...encoreNoAlbumArtSurfaceSx(theme),
              width: 40,
              height: 40,
              borderRadius: 0.75,
              minHeight: 0,
              display: 'inline-flex',
            }}
          >
            <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 20 }} aria-hidden />
          </Box>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={song.title}
        secondary={song.artist}
        primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true, title: song.title }}
        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
      />
      {mode === 'already' ? (
        <Chip
          icon={<CheckIcon sx={{ fontSize: 14 }} />}
          label="Practicing"
          size="small"
          variant="outlined"
          sx={{ ml: 1, alignSelf: 'center', fontWeight: 600 }}
        />
      ) : (
        <Tooltip title={`Add ${song.title} to practice`}>
          <Box
            component="span"
            sx={{
              ml: 1,
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
            Add
          </Box>
        </Tooltip>
      )}
    </ListItemButton>
  );
}
