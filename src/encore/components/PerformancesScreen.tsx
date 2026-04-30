import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import type { EncorePerformance, EncoreSong } from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { useEncore } from '../context/EncoreContext';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { encorePerformancesTableSx } from './encoreImportReviewTableSx';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';

type SortKey = 'date' | 'song' | 'venue';

function formatPerformanceNotesLine(notes: string, maxLen = 72): string {
  const t = notes.trim();
  if (!t) return '';
  const stripped = t.replace(/^Imported:\s*/i, '').trim();
  const base = stripped || t;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

export function PerformancesScreen(): React.ReactElement {
  const { songs, performances, savePerformance, googleAccessToken } = useEncore();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [query, setQuery] = useState('');
  const [pickSongOpen, setPickSongOpen] = useState(false);
  const [pickedSong, setPickedSong] = useState<EncoreSong | null>(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);

  const venueOptions = useMemo(() => performances.map((p) => p.venueTag), [performances]);

  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s] as const)), [songs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = performances
      .map((p) => {
        const song = songById.get(p.songId);
        return { p, song };
      })
      .filter(({ p, song }) => {
        if (!q) return true;
        const hay = [song?.title, song?.artist, p.venueTag, p.date, p.notes ?? '']
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });

    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'date') {
        const c = a.p.date.localeCompare(b.p.date);
        return c * dir;
      }
      if (sortKey === 'venue') {
        const c = a.p.venueTag.localeCompare(b.p.venueTag, undefined, { sensitivity: 'base' });
        return c * dir;
      }
      const ta = a.song?.title ?? '';
      const tb = b.song?.title ?? '';
      const c = ta.localeCompare(tb, undefined, { sensitivity: 'base' });
      return c * dir;
    });
    return list;
  }, [performances, songById, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const openEdit = (p: EncorePerformance) => {
    setPerfEditing(p);
    setPerfSongId(p.songId);
    setPerfOpen(true);
  };

  const openAddAfterPick = () => {
    if (!pickedSong) return;
    setPickSongOpen(false);
    setPerfEditing(null);
    setPerfSongId(pickedSong.id);
    setPerfOpen(true);
    setPickedSong(null);
  };

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 4 },
        maxWidth: { xs: 720, md: 1100, lg: 1280 },
        mx: 'auto',
        width: 1,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
        <Box>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 800, letterSpacing: '0.14em', lineHeight: 1.2, display: 'block', mb: 0.5 }}
          >
            Library
          </Typography>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', m: 0, lineHeight: 1.25 }}>
            Performances
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
            Every logged show with venue, date, and video link. Open a song to edit details or attach charts.
          </Typography>
        </Box>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setPickSongOpen(true)} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
          Add performance
        </Button>
      </Stack>

      <TextField
        size="small"
        label="Search performances"
        placeholder="Song, artist, venue, date…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        sx={{ mb: 2, maxWidth: 420 }}
      />

      {performances.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          No performances yet. Add one from a song page or use <strong>Add performance</strong> here.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
          <Table size="small" stickyHeader sx={encorePerformancesTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 124, minWidth: 124, maxWidth: 140 }}>Video</TableCell>
                <TableCell sortDirection={sortKey === 'date' ? sortDir : false}>
                  <TableSortLabel active={sortKey === 'date'} direction={sortKey === 'date' ? sortDir : 'asc'} onClick={() => toggleSort('date')}>
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === 'song' ? sortDir : false}>
                  <TableSortLabel active={sortKey === 'song'} direction={sortKey === 'song' ? sortDir : 'asc'} onClick={() => toggleSort('song')}>
                    Song
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === 'venue' ? sortDir : false}>
                  <TableSortLabel active={sortKey === 'venue'} direction={sortKey === 'venue' ? sortDir : 'asc'} onClick={() => toggleSort('venue')}>
                    Venue
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 100 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ p, song }) => {
                const url = performanceVideoOpenUrl(p);
                return (
                  <TableRow key={p.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ width: 124, minWidth: 124, maxWidth: 140, verticalAlign: 'top' }}>
                      <Stack spacing={0.75} alignItems="flex-start" sx={{ py: 0.25, maxWidth: 124 }}>
                        <PerformanceVideoThumb
                          performance={p}
                          width={88}
                          alt={
                            url
                              ? `Video thumbnail for ${song?.title ?? 'song'} on ${p.date}`
                              : `Performance on ${p.date}`
                          }
                        />
                        {url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                            fullWidth
                            sx={{ flexShrink: 0, justifyContent: 'center' }}
                          >
                            Open
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No link
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {p.date}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => song && navigateEncore({ kind: 'song', id: song.id })}
                        disabled={!song}
                        sx={{
                          textAlign: 'left',
                          justifyContent: 'flex-start',
                          fontWeight: 700,
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          color: 'text.primary',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        {song?.title ?? 'Unknown song'}
                      </Button>
                      {song?.artist ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {song.artist}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {p.venueTag?.trim() || 'Venue'}
                      </Typography>
                      {p.notes ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.35, lineHeight: 1.45 }}
                          title={p.notes}
                        >
                          {formatPerformanceNotesLine(p.notes)}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" aria-label="Edit performance" onClick={() => openEdit(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={pickSongOpen} onClose={() => setPickSongOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Choose song</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={songs}
            value={pickedSong}
            onChange={(_, v) => setPickedSong(v)}
            getOptionLabel={(s) => `${s.title} — ${s.artist}`.trim()}
            renderInput={(params) => <TextField {...params} label="Song" placeholder="Type to search" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickSongOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => openAddAfterPick()} disabled={!pickedSong}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {perfSongId && (
        <PerformanceEditorDialog
          open={perfOpen}
          performance={perfEditing}
          songId={perfSongId}
          googleAccessToken={googleAccessToken}
          venueOptions={venueOptions}
          onClose={() => {
            setPerfOpen(false);
            setPerfSongId(null);
            setPerfEditing(null);
          }}
          onSave={async (perf) => {
            await savePerformance(perf);
          }}
        />
      )}
    </Box>
  );
}
