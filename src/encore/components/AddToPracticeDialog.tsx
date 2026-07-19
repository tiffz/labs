import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import CheckIcon from '@mui/icons-material/Check';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import type { SystemStyleObject } from '@mui/system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEncore } from '../context/EncoreContext';
import { useDebouncedSpotifyTrackSearch } from '../hooks/useDebouncedSpotifyTrackSearch';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { withPracticingToggle } from '../repertoire/practicingToggle';
import { encoreSongStubFromSpotifySearchTrack } from '../spotify/encoreSpotifyPlaylistSync';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
  encoreRadius,
  encoreShadowSurface,
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
import { SpotifyBrandIcon } from './EncoreBrandIcon';
import { EncoreSpotifyTrackListRow } from '../ui/EncoreSpotifyTrackListRow';

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
 * - **Search mode** (default): one search field; scrollable results (library, then Spotify when
 *   nothing addable matches); pinned manual entry at the bottom of the panel.
 * - **Create mode**: title/artist only (Spotify picks stay in search mode). Back returns to search
 *   with query intact.
 */
export function AddToPracticeDialog(props: AddToPracticeDialogProps): React.ReactElement {
  const { open, onClose, onAdded } = props;
  const theme = useTheme();
  const { songs, performances, saveSong, repertoireExtras, spotifyLinked } = useEncore();
  const spotifyClientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const spotifySearchEnabled = Boolean(spotifyClientId && spotifyLinked);

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

  const handlePickSpotifyTrack = useCallback(
    async (track: SpotifySearchTrack) => {
      setBusyId(track.id);
      try {
        const now = new Date().toISOString();
        const synced: EncoreSong = applyTemplateProgressToSong(
          withPracticingToggle(encoreSongStubFromSpotifySearchTrack(track, { practicing: true }), true, now),
          repertoireExtras.milestoneTemplate,
        );
        await saveSong(synced);
        onAdded(synced);
        onClose();
      } finally {
        setBusyId(null);
      }
    },
    [onAdded, onClose, repertoireExtras.milestoneTemplate, saveSong],
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
  const showSpotifySection =
    mode === 'search' && spotifySearchEnabled && trimmedQuery.length >= 2;

  const { results: spotifyResultsRaw, loading: spotifyLoading } = useDebouncedSpotifyTrackSearch({
    query: trimmedQuery,
    clientId: spotifyClientId,
    enabled: open && showSpotifySection,
  });

  const librarySpotifyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const song of songs) {
      const id = song.spotifyTrackId?.trim();
      if (id) ids.add(id);
    }
    return ids;
  }, [songs]);

  const spotifyResults = useMemo(
    () => spotifyResultsRaw.filter((track) => !librarySpotifyIds.has(track.id)),
    [librarySpotifyIds, spotifyResultsRaw],
  );

  const showLibraryEmptyHint = !hasAnyResults && trimmedQuery.length === 0 && songs.length > 0;
  const showLibraryNoMatchHint = !hasAnyResults && trimmedQuery.length > 0;

  const panelSx = useMemo(
    () => ({
      border: 1,
      borderStyle: 'solid' as const,
      borderColor: encoreHairline,
      borderRadius: encoreRadius,
      boxShadow: encoreShadowSurface,
      bgcolor: theme.palette.background.paper,
      maxHeight: 400,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
    [theme.palette.background.paper],
  );

  const sectionHeaderSx = useMemo(
    () => ({
      typography: 'caption',
      fontWeight: 700,
      color: 'text.secondary',
      bgcolor: 'background.paper',
      lineHeight: 2.5,
      px: 2,
      py: 0.25,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }),
    [],
  );

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
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
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
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },

                htmlInput: { 'aria-label': 'Search your library' }
              }} />

            <Box sx={panelSx}>
              <List
                dense
                sx={{
                  overflow: 'auto',
                  flex: '1 1 auto',
                  minHeight: 0,
                  py: 0,
                  '& .MuiListItemButton-root': addToPracticeResultRowSx(),
                }}
              >
                {songs.length === 0 && !hasAnyResults && !showSpotifySection ? (
                  <Box sx={{ px: 2, py: 3 }}>
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      Your library is empty. Add a song with the button below.
                    </Typography>
                  </Box>
                ) : null}
                {showLibraryEmptyHint ? (
                  <Box sx={{ px: 2, py: 3 }}>
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      Search your library by title, artist, venue, key, or tag.
                    </Typography>
                  </Box>
                ) : null}
                {showLibraryNoMatchHint && !showSpotifySection ? (
                  <Box sx={{ px: 2, pt: 2, pb: hasAnyResults ? 1 : 2 }}>
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      No matches in your library.
                    </Typography>
                  </Box>
                ) : null}
                {hasAnyResults ? (
                  <>
                    {available.length > 0 ? (
                      <ListSubheader disableSticky sx={sectionHeaderSx}>
                        Your library
                      </ListSubheader>
                    ) : null}
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
                      <ListSubheader disableSticky sx={sectionHeaderSx}>
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
                ) : null}
                {showSpotifySection ? (
                  <>
                    {showLibraryNoMatchHint ? (
                      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          No matches in your library.
                        </Typography>
                      </Box>
                    ) : null}
                    <ListSubheader
                      disableSticky
                      sx={{
                        ...sectionHeaderSx,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <SpotifyBrandIcon sx={{ fontSize: 16 }} aria-hidden />
                      From Spotify
                    </ListSubheader>
                    {hasAnyResults ? (
                      <Box sx={{ px: 2, pb: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            lineHeight: 1.45
                          }}>
                          Not what you meant? Pick a track to save to your library and add to practice.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ px: 2, pb: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            lineHeight: 1.45
                          }}>
                          Pick a track to save to your library and add to practice.
                        </Typography>
                      </Box>
                    )}
                    {spotifyLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
                        <CircularProgress size={22} color="primary" />
                      </Box>
                    ) : spotifyResults.length === 0 ? (
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          No Spotify matches for “{trimmedQuery}”.
                        </Typography>
                      </Box>
                    ) : (
                      spotifyResults.map((track) => (
                        <SpotifyExternalResultRow
                          key={track.id}
                          track={track}
                          busy={busyId === track.id}
                          onClick={() => void handlePickSpotifyTrack(track)}
                        />
                      ))
                    )}
                  </>
                ) : null}
              </List>
              <ManualAddFooter query={trimmedQuery} onClick={enterCreateMode} />
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                lineHeight: 1.5
              }}>
              Enter title and artist without a Spotify link. Use Back to search your library or pick a
              track from Spotify.
            </Typography>
            <NewSongDraftForm
              draft={createDraft}
              onDraftChange={setCreateDraft}
              onSubmit={submitCreate}
              autoFocusOnMount
              hideSpotifyControls
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

function addToPracticeResultRowSx(): SystemStyleObject<Theme> {
  return {
    py: 1,
    '&:hover': {
      bgcolor: 'action.hover',
    },
  };
}

function addToPracticeAddActionSx(): SystemStyleObject<Theme> {
  return {
    ml: 1,
    alignSelf: 'center',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    color: 'primary.main',
    fontSize: '0.78rem',
    fontWeight: 700,
    flexShrink: 0,
  };
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
      sx={{ opacity: mode === 'already' ? 0.82 : 1 }}
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
        slotProps={{
          primary: { variant: 'body2',
            noWrap: true,
            title: song.title,
            sx: { fontWeight: 600,  color: 'text.primary' },
          },

          secondary: {
            variant: 'caption',
            noWrap: true,
            sx: { color: 'text.secondary' },
          }
        }} />
      {mode === 'already' ? (
        <Chip
          icon={<CheckIcon sx={{ fontSize: 14 }} />}
          label="Practicing"
          size="small"
          variant="outlined"
          sx={{
            ml: 1,
            alignSelf: 'center',
            fontWeight: 600,
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        />
      ) : (
        <Tooltip title={`Add ${song.title} to practice`}>
          <Box component="span" sx={addToPracticeAddActionSx()}>
            <AddIcon sx={{ fontSize: 16 }} />
            Add
          </Box>
        </Tooltip>
      )}
    </ListItemButton>
  );
}

type SpotifyExternalResultRowProps = {
  track: SpotifySearchTrack;
  busy: boolean;
  onClick: () => void;
};

function SpotifyExternalResultRow({
  track,
  busy,
  onClick,
}: SpotifyExternalResultRowProps): React.ReactElement {
  return (
    <ListItemButton onClick={onClick} disabled={busy} alignItems="center">
      <ListItemText
        disableTypography
        primary={
          <EncoreSpotifyTrackListRow
            track={track}
            trailing={
              <Tooltip title="Save to library and add to practice">
                <Box component="span" sx={addToPracticeAddActionSx()}>
                  <AddIcon sx={{ fontSize: 16 }} />
                  Add
                </Box>
              </Tooltip>
            }
          />
        }
      />
    </ListItemButton>
  );
}

type ManualAddFooterProps = {
  query: string;
  onClick: () => void;
};

/** Pinned fallback — always visible so manual entry never scrolls away. */
function ManualAddFooter({ query, onClick }: ManualAddFooterProps): React.ReactElement {
  const trimmed = query.trim();
  return (
    <ListItemButton
      onClick={onClick}
      alignItems="center"
      sx={{
        flexShrink: 0,
        py: 1.25,
        px: 2,
        borderTop: 1,
        borderStyle: 'solid',
        borderColor: encoreHairline,
        bgcolor: 'background.paper',
        color: 'text.secondary',
        '&:hover': {
          bgcolor: 'action.hover',
          color: 'text.primary',
        },
      }}
    >
      <ListItemAvatar sx={{ minWidth: 44 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: encoreRadius,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            border: 1,
            borderStyle: 'solid',
            borderColor: encoreHairline,
            boxShadow: encoreShadowSurface,
            color: 'text.secondary',
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 18 }} aria-hidden />
        </Box>
      </ListItemAvatar>
      <ListItemText
        primary={trimmed.length > 0 ? 'Add title and artist manually' : 'Add a new song manually'}
        secondary={
          trimmed.length > 0
            ? `Title starts as “${trimmed}”. No Spotify link.`
            : 'Enter title and artist without Spotify.'
        }
        slotProps={{
          primary: { variant: 'body2', color: 'text.primary', sx: { fontWeight: 600 } },

          secondary: {
            variant: 'caption',
            sx: { lineHeight: 1.4, color: 'text.secondary' },
          }
        }} />
      <Box component="span" sx={addToPracticeAddActionSx()}>
        Enter
      </Box>
    </ListItemButton>
  );
}
