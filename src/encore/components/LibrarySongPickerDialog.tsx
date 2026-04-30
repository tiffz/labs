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
import { useMemo, type ReactElement } from 'react';
import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../theme/encoreUiTokens';
import type { EncoreSong } from '../types';
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
  } = props;

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="library-song-picker-title">
      <DialogTitle id="library-song-picker-title" sx={encoreDialogTitleSx}>
        Pick from library
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
          label="Search library"
          placeholder="Title or artist"
          value={pickQuery}
          onChange={(e) => onPickQueryChange(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <List dense sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {preferred.length === 0 && rest.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {existingSongs.length === 0 ? emptyLibraryHint : emptySearchHint}
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
                      primaryTypographyProps={{ noWrap: true, title: s.title }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
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
                      primaryTypographyProps={{ noWrap: true, title: s.title }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                );
              })}
            </>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
