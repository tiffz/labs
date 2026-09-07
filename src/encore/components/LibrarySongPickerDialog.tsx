import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import { useMemo, type ReactElement } from 'react';
import { useDebouncedSpotifyTrackSearch } from '../hooks/useDebouncedSpotifyTrackSearch';
import { EncoreSpotifyTrackListRow } from '../ui/EncoreSpotifyTrackListRow';
import { encoreSongStubFromSpotifySearchTrack } from '../spotify/encoreSpotifyPlaylistSync';
import { encoreSongFromManualTitleArtist } from '../import/bulkPerformanceSong';
import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../theme/encoreUiTokens';
import type { EncoreSong } from '../types';
import type { EncoreOriginalSong } from '../originals/types';
import { scoreSongSimilarityForImport } from '../import/findExistingSongForImport';

export type LibrarySongPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  existingSongs: EncoreSong[];
  /** Incoming row as an Encore-shaped song for similarity ranking (reuse id/title/artist fields only). */
  incoming: EncoreSong | null;
  pickQuery: string;
  onPickQueryChange: (q: string) => void;
  onSelect: (song: EncoreSong) => void;
  /** True when another row in the same import flow already uses this library song. */
  linkedOnOtherRow: (song: EncoreSong) => boolean;
  /** Shown when the library is empty. */
  emptyLibraryHint?: string;
  /** Shown when search yields no rows. */
  emptySearchHint?: string;
  /**
   * Songwriting originals offered below the repertoire songs. Omit to keep the picker songs-only —
   * the bulk import flows deliberately do, because title-matching an import row against an original
   * would silently file a performance video under the wrong subject.
   */
  originals?: EncoreOriginalSong[];
  /** Required to make {@link LibrarySongPickerDialogProps.originals} selectable. */
  onSelectOriginal?: (original: EncoreOriginalSong) => void;
  /**
   * Opt in to creating a song that is not in the library yet, from Spotify or by hand.
   *
   * Deliberately opt-in. The three bulk flows (performance import, score import, playlist import)
   * also use this dialog and each has its own row-level resolution machinery — a create path
   * appearing there would compete with it. Only the "log a performance" flow passes this.
   *
   * The created song is handed back unsaved; the caller persists it (and knows whether to mark it
   * `practicing`). Songs created here are NOT practicing: they belong in the library, not in the
   * practice rotation, which is the existing line between "in my catalogue" and "working on it".
   */
  onCreateSong?: (song: EncoreSong) => void;
  /** Spotify client id, required for the search half of the create path. */
  spotifyClientId?: string;
  /** Whether Spotify is connected; when false only manual creation is offered. */
  spotifyLinked?: boolean;
};

/**
 * Searchable library list with “preferred vs already linked elsewhere” sections (same UX as playlist import).
 */
export function LibrarySongPickerDialog(props: LibrarySongPickerDialogProps): ReactElement {
  const {
    open,
    onClose,
    existingSongs,
    incoming,
    pickQuery,
    onPickQueryChange,
    onSelect,
    linkedOnOtherRow,
    emptyLibraryHint = 'Your library is empty. Add songs from Library first, or use Spotify / manual match on the row.',
    emptySearchHint = 'No songs match that search.',
    originals,
    onSelectOriginal,
    onCreateSong,
    spotifyClientId,
    spotifyLinked = false,
  } = props;

  const canCreate = Boolean(onCreateSong);
  const trimmedQuery = pickQuery.trim();
  const { results: spotifyResults, loading: spotifyLoading } = useDebouncedSpotifyTrackSearch({
    query: trimmedQuery,
    clientId: spotifyClientId ?? '',
    // Only search once there is something to search for, and only when creating is on offer.
    enabled: canCreate && spotifyLinked && trimmedQuery.length >= 2,
  });

  /** Spotify hits already in the library would be duplicates — the library rows above cover them. */
  const newSpotifyResults = useMemo(() => {
    const known = new Set(existingSongs.map((s) => s.spotifyTrackId).filter(Boolean));
    return spotifyResults.filter((t) => !known.has(t.id));
  }, [spotifyResults, existingSongs]);

  const { preferred, rest } = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    let list = [...existingSongs];
    if (q) {
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    const preferred = list.filter((s) => !linkedOnOtherRow(s));
    const rest = list.filter((s) => linkedOnOtherRow(s));
    const sortBySimThenTitle = (a: EncoreSong, b: EncoreSong) => {
      if (incoming) {
        const sa = scoreSongSimilarityForImport(a, incoming);
        const sb = scoreSongSimilarityForImport(b, incoming);
        if (sb !== sa) return sb - sa;
      }
      return `${a.title} ${a.artist}`.localeCompare(`${b.title} ${b.artist}`, undefined, { sensitivity: 'base' });
    };
    preferred.sort(sortBySimThenTitle);
    rest.sort(sortBySimThenTitle);
    return { preferred, rest };
  }, [existingSongs, pickQuery, incoming, linkedOnOtherRow]);

  const matchingOriginals = useMemo(() => {
    if (!originals || !onSelectOriginal) return [];
    const q = pickQuery.trim().toLowerCase();
    const list = q ? originals.filter((o) => o.title.toLowerCase().includes(q)) : [...originals];
    return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, [originals, onSelectOriginal, pickQuery]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="library-song-picker-title">
      <DialogTitle id="library-song-picker-title" sx={encoreDialogTitleSx}>
        {canCreate ? 'Choose a song' : 'Pick from library'}
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'visible',
        }}
      >
        <TextField
          size="small"
          label={canCreate && spotifyLinked ? 'Search your library or Spotify' : 'Search library'}
          placeholder="Title or artist"
          value={pickQuery}
          onChange={(e) => onPickQueryChange(e.target.value)}
          fullWidth
          slotProps={{
            inputLabel: { shrink: true }
          }}
        />
        <List dense sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {preferred.length === 0 && rest.length === 0 && matchingOriginals.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {canCreate
                  ? trimmedQuery
                    ? 'Nothing in your library matches. Add it from Spotify or by hand below.'
                    : 'Search for a song, or add one that is not in your library yet.'
                  : existingSongs.length === 0 && (originals?.length ?? 0) === 0
                    ? emptyLibraryHint
                    : emptySearchHint}
              </Typography>
            </Box>
          ) : (
            <>
              {preferred.map((s) => {
                const sim =
                  incoming != null ? Math.round(scoreSongSimilarityForImport(s, incoming) * 100) : null;
                return (
                  <ListItemButton key={s.id} onClick={() => onSelect(s)} alignItems="flex-start">
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Avatar src={s.albumArtUrl} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={s.title}
                      secondary={sim != null ? `${s.artist} · ${sim}%` : s.artist}
                      slotProps={{
                        primary: { noWrap: true, title: s.title },
                        secondary: { noWrap: true }
                      }} />
                  </ListItemButton>
                );
              })}
              {rest.length > 0 ? (
                <ListSubheader sx={{ typography: 'caption', fontWeight: 700, bgcolor: 'background.paper', lineHeight: 2.5 }}>
                  Already linked on another row in this import
                </ListSubheader>
              ) : null}
              {rest.map((s) => {
                const sim =
                  incoming != null ? Math.round(scoreSongSimilarityForImport(s, incoming) * 100) : null;
                return (
                  <ListItemButton key={s.id} onClick={() => onSelect(s)} alignItems="flex-start">
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Avatar src={s.albumArtUrl} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={s.title}
                      secondary={sim != null ? `${s.artist} · ${sim}%` : s.artist}
                      slotProps={{
                        primary: { noWrap: true, title: s.title },
                        secondary: { noWrap: true }
                      }} />
                  </ListItemButton>
                );
              })}
              {matchingOriginals.length > 0 ? (
                <ListSubheader sx={{ typography: 'caption', fontWeight: 700, bgcolor: 'background.paper', lineHeight: 2.5 }}>
                  Originals
                </ListSubheader>
              ) : null}
              {matchingOriginals.map((o) => (
                <ListItemButton key={o.id} onClick={() => onSelectOriginal?.(o)} alignItems="flex-start">
                  <ListItemAvatar sx={{ minWidth: 56 }}>
                    <Avatar variant="rounded" alt="" sx={{ width: 44, height: 44 }}>
                      <MusicNoteIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={o.title}
                    secondary="Original"
                    slotProps={{
                      primary: { noWrap: true, title: o.title },
                      secondary: { noWrap: true }
                    }} />
                </ListItemButton>
              ))}
            </>
          )}
        </List>
        {canCreate ? (
          <List
            dense
            sx={{ maxHeight: 260, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <ListSubheader
              sx={{ typography: 'caption', fontWeight: 700, bgcolor: 'background.paper', lineHeight: 2.5 }}
            >
              Not in your library
            </ListSubheader>
            {spotifyLinked && trimmedQuery.length >= 2 ? (
              <>
                {spotifyLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Searching Spotify…
                    </Typography>
                  </Box>
                ) : null}
                {newSpotifyResults.map((track) => (
                  <ListItemButton
                    key={track.id}
                    alignItems="flex-start"
                    onClick={() => {
                      // Practicing stays off: this belongs in the library, not the practice rotation.
                      onCreateSong?.(encoreSongStubFromSpotifySearchTrack(track, { practicing: false }));
                    }}
                  >
                    <EncoreSpotifyTrackListRow track={track} />
                  </ListItemButton>
                ))}
              </>
            ) : null}
            {trimmedQuery ? (
              <ListItemButton
                alignItems="flex-start"
                onClick={() => {
                  // Manual fallback: no Spotify match, or Spotify not connected. Artist is left
                  // blank rather than guessed — the builder fills its own default.
                  onCreateSong?.(encoreSongFromManualTitleArtist(trimmedQuery, '', new Date().toISOString()));
                }}
              >
                <ListItemAvatar sx={{ minWidth: 56 }}>
                  <Avatar variant="rounded" alt="" sx={{ width: 44, height: 44 }}>
                    <AddIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Add "${trimmedQuery}"`}
                  secondary={spotifyLinked ? 'Without Spotify details' : 'Connect Spotify for artist and artwork'}
                  slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                />
              </ListItemButton>
            ) : null}
          </List>
        ) : null}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
