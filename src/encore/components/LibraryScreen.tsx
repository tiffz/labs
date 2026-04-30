/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EncorePerformance, EncoreSong } from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { useEncore } from '../context/EncoreContext';
import { encoreMutedCaptionSx, encoreMaxWidthPage } from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PlaylistImportDialog } from './PlaylistImportDialog';
import { BulkPerformanceImportDialog } from './BulkPerformanceImportDialog';
import { milestoneProgressSummary } from '../repertoire/repertoireMilestoneSummary';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';

const REPERTOIRE_VIEW_STORAGE_KEY = 'encore.library.repertoireView';

type RepertoireViewMode = 'table' | 'grid';
type PerfPresenceFilter = 'all' | 'with' | 'none';
type PracticingFilter = 'all' | 'practicing';

function normalizeVenueTag(tag: string): string {
  return tag.trim() || 'Venue';
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

type EncoreRepertoireMrtRow = {
  song: EncoreSong;
  title: string;
  artist: string;
  keyDisplay: string;
  bpmValue: number | null;
  bpmDisplay: string;
  perfCount: number;
  venues: string;
  lastIso: string;
  lastDisplay: string;
  genresDisplay: string;
  milestoneShort: string;
  milestoneDetail: string;
};

function songMatchesSearch(song: EncoreSong, query: string, perfs: EncorePerformance[]): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  if (song.title.toLowerCase().includes(t) || song.artist.toLowerCase().includes(t)) return true;
  for (const g of song.spotifyGenres ?? []) {
    if (g.toLowerCase().includes(t)) return true;
  }
  const songPerfs = perfs.filter((p) => p.songId === song.id);
  for (const p of songPerfs) {
    if (normalizeVenueTag(p.venueTag).toLowerCase().includes(t)) return true;
    if (p.date.toLowerCase().includes(t)) return true;
  }
  const keyBits = [song.performanceKey, song.originalKey].filter(Boolean).join(' ').toLowerCase();
  if (keyBits.includes(t)) return true;
  const bpm = song.performanceBpm ?? song.originalBpm;
  if (bpm != null && Number.isFinite(bpm) && String(Math.round(bpm)).includes(t)) return true;
  return false;
}

export function LibraryScreen(): React.ReactElement {
  const theme = useTheme();
  const { songs, performances, repertoireExtras, saveSong, deleteSong, savePerformance, googleAccessToken, spotifyLinked } =
    useEncore();
  const [importOpen, setImportOpen] = useState(false);
  const [bulkPerfOpen, setBulkPerfOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; song: EncoreSong }>(null);
  const [genreFilter, setGenreFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [perfPresence, setPerfPresence] = useState<PerfPresenceFilter>('all');
  const [practicingFilter, setPracticingFilter] = useState<PracticingFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RepertoireViewMode>(() => {
    if (typeof window === 'undefined') return 'table';
    return window.localStorage.getItem(REPERTOIRE_VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'table';
  });

  useEffect(() => {
    window.localStorage.setItem(REPERTOIRE_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const libraryStats = useMemo(() => {
    const venueMap = new Map<string, number>();
    for (const p of performances) {
      const v = normalizeVenueTag(p.venueTag);
      venueMap.set(v, (venueMap.get(v) ?? 0) + 1);
    }
    const topVenues = [...venueMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { topVenues, totalPerf: performances.length };
  }, [performances]);

  const venueOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of repertoireExtras.venueCatalog) {
      const t = v.trim();
      if (t) s.add(t);
    }
    for (const p of performances) {
      const t = p.venueTag.trim();
      if (t) s.add(t);
    }
    return [...s];
  }, [repertoireExtras.venueCatalog, performances]);

  const genreOptions = useMemo(() => {
    const s = new Set<string>();
    for (const song of songs) {
      for (const g of song.spotifyGenres ?? []) {
        const t = g.trim();
        if (t) s.add(t);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const venueChipOptions = useMemo(() => {
    const venueMap = new Map<string, number>();
    for (const p of performances) {
      const v = normalizeVenueTag(p.venueTag);
      venueMap.set(v, (venueMap.get(v) ?? 0) + 1);
    }
    return [...venueMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v]) => v);
  }, [performances]);

  const perfBySong = useMemo(() => {
    const m = new Map<string, EncorePerformance[]>();
    for (const p of performances) {
      const list = m.get(p.songId) ?? [];
      list.push(p);
      m.set(p.songId, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return m;
  }, [performances]);

  const repertoireSongs = useMemo(() => {
    let list = songs;
    if (genreFilter) {
      list = list.filter((x) => x.spotifyGenres?.includes(genreFilter));
    }
    if (perfPresence === 'with') {
      list = list.filter((s) => (perfBySong.get(s.id) ?? []).length > 0);
    } else if (perfPresence === 'none') {
      list = list.filter((s) => (perfBySong.get(s.id) ?? []).length === 0);
    }
    if (venueFilter) {
      list = list.filter((s) =>
        performances.some((p) => p.songId === s.id && normalizeVenueTag(p.venueTag) === venueFilter),
      );
    }
    if (practicingFilter === 'practicing') {
      list = list.filter((s) => Boolean(s.practicing));
    }
    if (searchQuery.trim()) {
      list = list.filter((s) => songMatchesSearch(s, searchQuery, performances));
    }
    return list;
  }, [songs, genreFilter, perfPresence, practicingFilter, venueFilter, searchQuery, performances, perfBySong]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || genreFilter || perfPresence !== 'all' || practicingFilter !== 'all' || venueFilter,
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setGenreFilter('');
    setPerfPresence('all');
    setPracticingFilter('all');
    setVenueFilter(null);
  }, []);

  const tableData = useMemo((): EncoreRepertoireMrtRow[] => {
    return repertoireSongs.map((s) => {
      const perfList = performances.filter((p) => p.songId === s.id);
      const perfCount = perfList.length;
      const venueSet = new Set(perfList.map((p) => normalizeVenueTag(p.venueTag)));
      const venues = [...venueSet].sort((a, b) => a.localeCompare(b)).join(', ') || '—';
      const last =
        perfList.length === 0 ? null : perfList.reduce((best, p) => (p.date >= best.date ? p : best), perfList[0]!).date;
      const keyBits = [s.performanceKey, s.originalKey].filter(Boolean);
      const keyDisplay = keyBits.length ? keyBits.join(' · ') : '—';
      const bpmVal = s.performanceBpm ?? s.originalBpm;
      const bpmDisplay = bpmVal != null && Number.isFinite(bpmVal) ? String(Math.round(bpmVal)) : '—';
      const genresDisplay = (s.spotifyGenres ?? []).length ? (s.spotifyGenres ?? []).join(', ') : '—';
      const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
      return {
        song: s,
        title: s.title,
        artist: s.artist,
        keyDisplay,
        bpmValue: bpmVal != null && Number.isFinite(bpmVal) ? Math.round(bpmVal) : null,
        bpmDisplay,
        perfCount,
        venues,
        lastIso: last ?? '',
        lastDisplay: formatShortDate(last),
        genresDisplay,
        milestoneShort: ms.labelShort,
        milestoneDetail: ms.tooltip,
      };
    });
  }, [repertoireSongs, performances, repertoireExtras.milestoneTemplate]);

  const openSong = useCallback((s: EncoreSong) => {
    navigateEncore({ kind: 'song', id: s.id });
  }, []);

  const columns = useMemo<MRT_ColumnDef<EncoreRepertoireMrtRow>[]>(
    () => [
      {
        id: 'art',
        header: '',
        size: 56,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          return (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1,
                overflow: 'hidden',
                flexShrink: 0,
                bgcolor: 'action.hover',
              }}
            >
              {s.albumArtUrl ? (
                <Box component="img" src={s.albumArtUrl} alt="" sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }} />
              ) : (
                <Box sx={{ ...encoreNoAlbumArtSurfaceSx(theme), width: 1, height: 1, minHeight: 0 }}>
                  <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 22 }} aria-hidden />
                </Box>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        size: 200,
        Cell: ({ renderedCellValue }) => (
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ lineHeight: 1.3, color: 'text.primary', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {renderedCellValue}
          </Typography>
        ),
      },
      {
        accessorKey: 'artist',
        header: 'Artist',
        size: 180,
        Cell: ({ renderedCellValue }) => (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.35, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {renderedCellValue}
          </Typography>
        ),
      },
      {
        accessorKey: 'keyDisplay',
        header: 'Key',
        size: 120,
        Cell: ({ row, renderedCellValue }) => (
          <Typography variant="body2" sx={{ fontWeight: row.original.keyDisplay === '—' ? 400 : 600 }}>
            {renderedCellValue}
          </Typography>
        ),
      },
      {
        accessorKey: 'bpmDisplay',
        header: 'BPM',
        sortingFn: 'alphanumeric',
        size: 88,
        Cell: ({ row }) => (
          <Typography
            variant="body2"
            sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: row.original.bpmDisplay === '—' ? 400 : 600 }}
          >
            {row.original.bpmDisplay}
          </Typography>
        ),
      },
      {
        accessorKey: 'perfCount',
        header: 'Shows',
        filterVariant: 'range',
        size: 96,
        Cell: ({ row }) =>
          row.original.perfCount > 0 ? (
            <Chip
              size="small"
              label={row.original.perfCount}
              variant="filled"
              sx={{
                fontWeight: 800,
                minWidth: 36,
                height: 26,
                bgcolor: 'action.selected',
                color: 'text.primary',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : (
            <Chip size="small" label="—" variant="outlined" sx={{ opacity: 0.55, height: 26, minWidth: 36 }} />
          ),
      },
      {
        id: 'practicing',
        header: 'Working on',
        size: 96,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          return (
            <Checkbox
              size="small"
              checked={Boolean(s.practicing)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const now = new Date().toISOString();
                void saveSong({ ...s, practicing: e.target.checked, updatedAt: now });
              }}
              inputProps={{ 'aria-label': `Working on ${s.title}` }}
            />
          );
        },
      },
      {
        id: 'milestones',
        header: 'Milestones',
        size: 120,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => (
          <Tooltip title={row.original.milestoneDetail} enterDelay={400}>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {row.original.milestoneShort}
            </Typography>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'venues',
        header: 'Venues',
        size: 200,
        Cell: ({ renderedCellValue }) => (
          <Typography variant="body2" color="text.secondary" noWrap title={String(renderedCellValue)}>
            {renderedCellValue}
          </Typography>
        ),
      },
      {
        accessorKey: 'lastIso',
        header: 'Last performed',
        sortingFn: 'alphanumeric',
        size: 140,
        Cell: ({ row }) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: row.original.lastIso ? 600 : 400,
              color: row.original.lastIso ? 'text.primary' : 'text.secondary',
            }}
          >
            {row.original.lastDisplay}
          </Typography>
        ),
      },
      {
        accessorKey: 'genresDisplay',
        header: 'Genres',
        size: 180,
        muiTableHeadCellProps: { sx: { display: { xs: 'none', lg: 'table-cell' } } },
        muiTableBodyCellProps: { sx: { display: { xs: 'none', lg: 'table-cell' } } },
        Cell: ({ renderedCellValue }) => (
          <Typography variant="caption" color="text.secondary" noWrap title={String(renderedCellValue)}>
            {renderedCellValue}
          </Typography>
        ),
      },
    ],
    [theme, saveSong],
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    getRowId: (row) => row.song.id,
    ...encoreMrtRepertoireTableOptions<EncoreRepertoireMrtRow>(),
    enableGlobalFilter: false,
    mrtTheme: {
      baseBackgroundColor: theme.palette.background.paper,
    },
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': { header: '', size: 52 },
    },
    renderRowActions: ({ row }) => (
      <IconButton
        size="small"
        aria-label={`More actions for ${row.original.song.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuAnchor({ el: e.currentTarget, song: row.original.song });
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
    ),
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => openSong(row.original.song),
      sx: (t) => ({
        cursor: 'pointer',
        '&:nth-of-type(even)': { bgcolor: alpha(t.palette.action.hover, 0.35) },
        '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.06) },
      }),
    }),
    initialState: {
      sorting: [{ id: 'title', desc: false }],
      density: 'compact',
      showColumnFilters: false,
    },
  });

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <EncorePageHeader
        kicker="Library"
        title="Repertoire"
        actions={
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<QueueMusicIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Import playlists
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => setBulkPerfOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Bulk import videos
            </Button>
            <Button size="small" variant="text" onClick={() => navigateEncore({ kind: 'repertoireSettings' })} sx={{ flexShrink: 0 }}>
              Venues & milestones
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigateEncore({ kind: 'songNew' })}
              sx={{ flexShrink: 0 }}
            >
              Add song
            </Button>
          </>
        }
      />

      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 2,
          p: 2.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.25, letterSpacing: '0.04em' }}>
          At a glance
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Chip size="small" variant="filled" color="primary" label={`${songs.length} songs`} sx={{ fontWeight: 700 }} />
          <Chip size="small" variant="outlined" label={`${libraryStats.totalPerf} performances`} sx={{ fontWeight: 600 }} />
        </Stack>
        {libraryStats.topVenues.length > 0 ? (
          <Typography variant="caption" color="text.secondary" component="div">
            Top venues:{' '}
            {libraryStats.topVenues.map(([v, n], i) => (
              <span key={v}>
                {i > 0 ? ' · ' : ''}
                <strong>{v}</strong> ({n})
              </span>
            ))}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Log a performance from a song to see venue stats here.
          </Typography>
        )}
      </Paper>

      {songs.length > 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <EncoreToolbarRow sx={{ mb: 0 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search title, artist, venue, genre, key…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputProps={{ 'aria-label': 'Search repertoire' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" aria-hidden />
                    </InputAdornment>
                  ),
                }}
                sx={{ maxWidth: { sm: 420 } }}
              />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_e, next: RepertoireViewMode | null) => {
                  if (next) setViewMode(next);
                }}
                aria-label="Repertoire layout"
                sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }}
              >
                <ToggleButton value="table" aria-label="Table view">
                  <ViewListIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Table
                </ToggleButton>
                <ToggleButton value="grid" aria-label="Grid view">
                  <ViewModuleIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Grid
                </ToggleButton>
              </ToggleButtonGroup>
            </EncoreToolbarRow>

            <Box>
              <Typography variant="caption" sx={{ ...encoreMutedCaptionSx, display: 'block', mb: 1 }}>
                Quick filters
              </Typography>
              <Stack spacing={1.25}>
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 72 }, fontWeight: 600 }}
                  >
                    Shows
                  </Typography>
                  {(
                    [
                      { id: 'all' as const, label: 'All songs' },
                      { id: 'with' as const, label: 'With shows' },
                      { id: 'none' as const, label: 'No shows yet' },
                    ] as const
                  ).map(({ id, label }) => (
                    <Chip
                      key={id}
                      size="small"
                      label={label}
                      clickable
                      color={perfPresence === id ? 'primary' : 'default'}
                      variant={perfPresence === id ? 'filled' : 'outlined'}
                      onClick={() => setPerfPresence(id)}
                    />
                  ))}
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 72 }, fontWeight: 600 }}
                  >
                    Practice
                  </Typography>
                  {(
                    [
                      { id: 'all' as const, label: 'All songs' },
                      { id: 'practicing' as const, label: 'Working on' },
                    ] as const
                  ).map(({ id, label }) => (
                    <Chip
                      key={id}
                      size="small"
                      label={label}
                      clickable
                      color={practicingFilter === id ? 'primary' : 'default'}
                      variant={practicingFilter === id ? 'filled' : 'outlined'}
                      onClick={() => setPracticingFilter(id)}
                    />
                  ))}
                </Stack>

                {venueChipOptions.length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ width: '100%', sm: { width: 'auto', minWidth: 72 }, fontWeight: 600 }}>
                      Venue
                    </Typography>
                    {venueChipOptions.map((v) => (
                      <Chip
                        key={v}
                        size="small"
                        label={v}
                        clickable
                        color={venueFilter === v ? 'secondary' : 'default'}
                        variant={venueFilter === v ? 'filled' : 'outlined'}
                        onClick={() => setVenueFilter((cur) => (cur === v ? null : v))}
                      />
                    ))}
                  </Stack>
                ) : null}

                {genreOptions.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                      Spotify genre
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        overflowX: 'auto',
                        flexWrap: 'nowrap',
                        pb: 0.5,
                        mx: -0.25,
                        px: 0.25,
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <Chip
                        size="small"
                        label="Any genre"
                        clickable
                        color={!genreFilter ? 'primary' : 'default'}
                        variant={!genreFilter ? 'filled' : 'outlined'}
                        onClick={() => setGenreFilter('')}
                        sx={{ flexShrink: 0 }}
                      />
                      {genreOptions.map((g) => (
                        <Chip
                          key={g}
                          size="small"
                          label={g}
                          clickable
                          color={genreFilter === g ? 'primary' : 'default'}
                          variant={genreFilter === g ? 'filled' : 'outlined'}
                          onClick={() => setGenreFilter((cur) => (cur === g ? '' : g))}
                          sx={{ flexShrink: 0, maxWidth: 220 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ) : null}

                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ alignSelf: 'flex-start' }}>
                  {hasActiveFilters ? (
                    <Button size="small" variant="text" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  ) : null}
                  {viewMode === 'table' ? (
                    <Button size="small" variant="text" onClick={() => table.setShowColumnFilters((v) => !v)}>
                      {table.getState().showColumnFilters ? 'Hide column filters' : 'Show column filters'}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {songs.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center', px: 2, lineHeight: 1.65, maxWidth: 520, mx: 'auto' }}>
          No songs yet. Add one to start. Data stays on this device until you sign in to Google for Drive sync (Account
          menu).
        </Typography>
      )}
      {songs.length > 0 && repertoireSongs.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
          No matches. Clear filters or try a shorter search.
        </Typography>
      ) : null}

      {repertoireSongs.length > 0 && viewMode === 'table' ? (
        <Box className="encore-mrt-repertoire" sx={{ width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <MaterialReactTable table={table} />
        </Box>
      ) : null}
      {repertoireSongs.length > 0 && viewMode === 'grid' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 2,
          }}
        >
          {repertoireSongs.map((s) => {
            const perfs = perfBySong.get(s.id) ?? [];
            const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
            const keyBits = [s.performanceKey, s.originalKey].filter(Boolean);
            const keyDisplay = keyBits.length ? keyBits.join(' · ') : '';
            const bpmVal = s.performanceBpm ?? s.originalBpm;
            const bpmPart =
              bpmVal != null && Number.isFinite(bpmVal) ? `${Math.round(bpmVal)} BPM` : '';
            const metaLine = [keyDisplay, bpmPart].filter(Boolean).join(' · ');
            return (
              <Card key={s.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <CardActionArea onClick={() => openSong(s)} sx={{ flex: 1, alignItems: 'stretch' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', pb: 1 }}>
                    {s.albumArtUrl ? (
                      <Box
                        component="img"
                        src={s.albumArtUrl}
                        alt=""
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 1.5,
                          objectFit: 'cover',
                          flexShrink: 0,
                          boxShadow: (t) => `0 1px 3px ${alpha(t.palette.common.black, 0.12)}`,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          ...encoreNoAlbumArtSurfaceSx(theme),
                          width: 64,
                          height: 64,
                          borderRadius: 1.5,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 28 }} aria-hidden />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800} noWrap>
                        {s.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {s.artist}
                      </Typography>
                      {metaLine ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }} noWrap>
                          {metaLine}
                        </Typography>
                      ) : null}
                      {s.practicing ? (
                        <Chip size="small" color="secondary" label="Working on" sx={{ mt: 0.75, height: 22, fontWeight: 700 }} />
                      ) : null}
                      {ms.total > 0 ? (
                        <Tooltip title={ms.tooltip}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }} noWrap>
                            Milestones {ms.labelShort}
                          </Typography>
                        </Tooltip>
                      ) : null}
                      {perfs.slice(0, 2).map((p) => (
                        <Typography key={p.id} variant="caption" display="block" color="text.secondary" noWrap>
                          {formatShortDate(p.date)} · {normalizeVenueTag(p.venueTag)}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 0.5, pb: 0.75 }}>
                  <IconButton
                    size="small"
                    aria-label={`More actions for ${s.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuAnchor({ el: e.currentTarget, song: s });
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            );
          })}
        </Box>
      ) : null}

      <Menu
        anchorEl={menuAnchor?.el ?? null}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            const song = menuAnchor?.song;
            setMenuAnchor(null);
            if (song) openSong(song);
          }}
        >
          Edit song
        </MenuItem>
        <MenuItem
          onClick={() => {
            const song = menuAnchor?.song;
            setMenuAnchor(null);
            if (!song) return;
            setPerfSongId(song.id);
            setPerfEditing(null);
            setPerfOpen(true);
          }}
        >
          Log show
        </MenuItem>
        <MenuItem
          onClick={() => {
            const song = menuAnchor?.song;
            setMenuAnchor(null);
            if (!song) return;
            if (!window.confirm(`Delete “${song.title}” from your library?`)) return;
            void deleteSong(song.id);
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      <PlaylistImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        googleAccessToken={googleAccessToken}
        spotifyLinked={spotifyLinked}
        existingSongs={songs}
        onSaveSong={saveSong}
      />
      <BulkPerformanceImportDialog
        open={bulkPerfOpen}
        onClose={() => setBulkPerfOpen(false)}
        songs={songs}
        googleAccessToken={googleAccessToken}
        spotifyLinked={spotifyLinked}
        onSaveSong={saveSong}
        onSavePerformances={async (rows) => {
          for (const p of rows) {
            await savePerformance(p);
          }
        }}
      />
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
          onSave={async (p) => {
            await savePerformance(p);
          }}
        />
      )}
    </Box>
  );
}
