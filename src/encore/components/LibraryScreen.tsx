/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SearchIcon from '@mui/icons-material/Search';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef, type MRT_RowSelectionState } from 'material-react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EncorePerformance, EncoreSong } from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { useEncore } from '../context/EncoreContext';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreMutedCaptionSx,
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';
import { AddSongDialog } from './AddSongDialog';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PlaylistImportDialog } from './PlaylistImportDialog';
import { BulkPerformanceImportDialog } from './BulkPerformanceImportDialog';
import { BulkScoreImportDialog } from './BulkScoreImportDialog';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { milestoneProgressSummary } from '../repertoire/repertoireMilestoneSummary';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from '../repertoire/performanceKeys';
import { collectAllSongTags, normalizeSongTags } from '../repertoire/songTags';
import { InlineChipSelect } from '../ui/InlineEditChip';
import { InlineSongTagsCell } from '../ui/InlineSongTagsCell';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';

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
  perfCount: number;
  venues: string;
  lastIso: string;
  lastDisplay: string;
  milestoneShort: string;
  milestoneDetail: string;
  tags: string[];
  tagsLabel: string;
};

function songMatchesSearch(song: EncoreSong, query: string, perfs: EncorePerformance[]): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  if (song.title.toLowerCase().includes(t) || song.artist.toLowerCase().includes(t)) return true;
  const songPerfs = perfs.filter((p) => p.songId === song.id);
  for (const p of songPerfs) {
    if (normalizeVenueTag(p.venueTag).toLowerCase().includes(t)) return true;
    if (p.date.toLowerCase().includes(t)) return true;
  }
  if ((song.performanceKey ?? '').toLowerCase().includes(t)) return true;
  if (song.tags && song.tags.some((tag) => tag.toLowerCase().includes(t))) return true;
  return false;
}

export function LibraryScreen(): React.ReactElement {
  const theme = useTheme();
  const {
    songs,
    performances,
    repertoireExtras,
    saveSong,
    deleteSong,
    savePerformance,
    googleAccessToken,
    spotifyLinked,
    effectiveDisplayName,
  } = useEncore();
  const [importOpen, setImportOpen] = useState(false);
  const [importPlacement, setImportPlacement] = useState<'reference' | 'backing'>('reference');
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [bulkPerfOpen, setBulkPerfOpen] = useState(false);
  const [bulkScoreOpen, setBulkScoreOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; song: EncoreSong }>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [perfPresence, setPerfPresence] = useState<PerfPresenceFilter>('all');
  const [practicingFilter, setPracticingFilter] = useState<PracticingFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RepertoireViewMode>(() => {
    if (typeof window === 'undefined') return 'table';
    return window.localStorage.getItem(REPERTOIRE_VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'table';
  });
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(REPERTOIRE_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'grid') setRowSelection({});
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
  }, [songs, perfPresence, practicingFilter, venueFilter, searchQuery, performances, perfBySong]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || perfPresence !== 'all' || practicingFilter !== 'all' || venueFilter,
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
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
      const keyDisplay = s.performanceKey?.trim() || '—';
      const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
      const tags = s.tags ?? [];
      return {
        song: s,
        title: s.title,
        artist: s.artist,
        keyDisplay,
        perfCount,
        venues,
        lastIso: last ?? '',
        lastDisplay: formatShortDate(last),
        milestoneShort: ms.labelShort,
        milestoneDetail: ms.tooltip,
        tags,
        tagsLabel: tags.join(', '),
      };
    });
  }, [repertoireSongs, performances, repertoireExtras.milestoneTemplate]);

  const tagFilterOptions = useMemo(() => collectAllSongTags(songs), [songs]);

  const openSong = useCallback((s: EncoreSong) => {
    navigateEncore({ kind: 'song', id: s.id });
  }, []);

  const selectedSongIds = useMemo(
    () => new Set(Object.keys(rowSelection).filter((id) => rowSelection[id])),
    [rowSelection],
  );

  const bulkSetPracticing = useCallback(
    async (practicing: boolean) => {
      const now = new Date().toISOString();
      for (const row of tableData) {
        if (!selectedSongIds.has(row.song.id)) continue;
        await saveSong({ ...row.song, practicing, updatedAt: now });
      }
      setRowSelection({});
    },
    [tableData, selectedSongIds, saveSong],
  );

  const bulkAddTag = useCallback(async () => {
    const tag = bulkTagInput.trim();
    if (!tag) return;
    const now = new Date().toISOString();
    for (const row of tableData) {
      if (!selectedSongIds.has(row.song.id)) continue;
      const next = normalizeSongTags([...(row.song.tags ?? []), tag]);
      await saveSong({ ...row.song, tags: next.length ? next : undefined, updatedAt: now });
    }
    setBulkTagInput('');
    setBulkTagOpen(false);
    setRowSelection({});
  }, [bulkTagInput, tableData, selectedSongIds, saveSong]);

  const bulkRemoveSongs = useCallback(async () => {
    for (const id of selectedSongIds) {
      await deleteSong(id);
    }
    setBulkDeleteOpen(false);
    setRowSelection({});
  }, [deleteSong, selectedSongIds]);

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
        size: 220,
        Cell: ({ renderedCellValue }) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: 1.35,
              color: 'text.primary',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
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
        accessorKey: 'tagsLabel',
        header: 'Tags',
        size: 200,
        enableSorting: false,
        filterVariant: 'multi-select',
        filterSelectOptions: tagFilterOptions,
        filterFn: (row, _columnId, filterValue: unknown) => {
          if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
          const cellTags = row.original.tags;
          if (cellTags.length === 0) return false;
          const lc = cellTags.map((t) => t.toLowerCase());
          return (filterValue as string[]).some((v) => lc.includes(String(v).toLowerCase()));
        },
        Cell: ({ row }) => {
          const song = row.original.song;
          const tags = row.original.tags;
          return (
            <InlineSongTagsCell
              tags={tags}
              suggestions={tagFilterOptions}
              onCommit={(next) => {
                void saveSong({
                  ...song,
                  tags: next.length ? next : undefined,
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
          );
        },
      },
      {
        accessorKey: 'keyDisplay',
        header: 'Key',
        size: 132,
        Cell: ({ row }) => {
          const song = row.original.song;
          return (
            <InlineChipSelect<string>
              value={song.performanceKey ?? null}
              options={ENCORE_PERFORMANCE_KEY_OPTIONS}
              freeSolo
              clearable
              placeholder="Set key"
              onChange={(v) => {
                void saveSong({
                  ...song,
                  performanceKey: v ?? undefined,
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
          );
        },
      },
      {
        accessorKey: 'perfCount',
        header: 'Performances',
        filterVariant: 'range',
        size: 132,
        Cell: ({ row }) =>
          row.original.perfCount > 0 ? (
            <Typography
              variant="body2"
              sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
            >
              {row.original.perfCount}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          ),
      },
      {
        id: 'practicing',
        header: 'Currently practicing',
        size: 104,
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
              inputProps={{ 'aria-label': `Currently practicing: ${s.title}` }}
              sx={{ p: 0.5, ml: -0.5 }}
            />
          );
        },
      },
      {
        id: 'milestones',
        header: 'Milestones',
        size: 112,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => (
          <Tooltip title={row.original.milestoneDetail} enterDelay={400}>
            <Typography
              variant="body2"
              sx={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500,
                color: 'text.secondary',
              }}
            >
              {row.original.milestoneShort}
            </Typography>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'venues',
        header: 'Venues',
        size: 200,
        Cell: ({ renderedCellValue }) => {
          const value = String(renderedCellValue ?? '').trim();
          const display = value || '—';
          const body = (
            <Typography
              variant="body2"
              sx={{
                lineHeight: 1.35,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                color: value === '—' || !value ? 'text.disabled' : 'text.secondary',
              }}
            >
              {display}
            </Typography>
          );
          return value && value !== '—' ? (
            <Tooltip title={value} enterDelay={400}>
              {body}
            </Tooltip>
          ) : (
            body
          );
        },
      },
      {
        accessorKey: 'lastIso',
        header: 'Last performed',
        sortingFn: 'alphanumeric',
        size: 144,
        Cell: ({ row }) => (
          <Typography
            variant="body2"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              color: row.original.lastIso ? 'text.primary' : 'text.disabled',
            }}
          >
            {row.original.lastDisplay}
          </Typography>
        ),
      },
    ],
    [theme, saveSong, tagFilterOptions],
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
    enableRowSelection: viewMode === 'table',
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
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
      onClick: (e) => {
        const el = e.target as HTMLElement;
        if (el.closest('.MuiCheckbox-root') || el.closest('input[type="checkbox"]')) return;
        openSong(row.original.song);
      },
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
        title={encorePossessivePageTitle(effectiveDisplayName, 'repertoire')}
        description={
          songs.length === 0
            ? 'Add a song or import a playlist to start.'
            : libraryStats.totalPerf === 0
              ? `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}. No performances logged yet.`
              : `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} · ${libraryStats.totalPerf} ${libraryStats.totalPerf === 1 ? 'performance' : 'performances'}${libraryStats.topVenues.length > 0 ? ` · top venue ${libraryStats.topVenues[0]?.[0] ?? ''}` : ''}`
        }
        actions={
          <>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddSongOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Add song
            </Button>
            <Button
              id="encore-library-import-button"
              size="small"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              endIcon={<ExpandMoreIcon sx={{ fontSize: 18, opacity: 0.85 }} />}
              aria-controls={importMenuAnchor ? 'encore-library-import-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={importMenuAnchor ? 'true' : undefined}
              onClick={(e) => setImportMenuAnchor(e.currentTarget)}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
            >
              Import
            </Button>
            <Menu
              id="encore-library-import-menu"
              anchorEl={importMenuAnchor}
              open={Boolean(importMenuAnchor)}
              onClose={() => setImportMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                list: {
                  'aria-labelledby': 'encore-library-import-button',
                  sx: {
                    py: 1.25,
                    px: 0.75,
                    '& .MuiMenuItem-root': {
                      py: 1.75,
                      px: 1.5,
                      minHeight: 0,
                      alignItems: 'flex-start',
                      columnGap: 1.25,
                      borderRadius: 1,
                    },
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  navigateEncore({ kind: 'help' });
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.35 }}>
                  <MenuBookOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Import guide (recommended order)"
                  primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35 } }}
                  secondaryTypographyProps={{ sx: { mt: 0.85 } }}
                  secondary="Opens the Help tab: playlists first, bulk files, naming tips."
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  setImportPlacement('reference');
                  setImportOpen(true);
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.35 }}>
                  <QueueMusicIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Import reference from playlists"
                  primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35 } }}
                  secondaryTypographyProps={{ component: 'div', sx: { mt: 0.85 } }}
                  secondary={
                    <Stack
                      component="span"
                      direction="row"
                      alignItems="center"
                      spacing={1.25}
                      aria-label="Spotify and YouTube playlists. Saves to reference recordings."
                    >
                      <SpotifyBrandIcon sx={{ fontSize: 18, display: 'block', flexShrink: 0 }} aria-hidden />
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ lineHeight: 0 }}>
                        ·
                      </Typography>
                      <YouTubeBrandIcon sx={{ fontSize: 18, display: 'block', flexShrink: 0 }} aria-hidden />
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ pl: 0.25 }}>
                        → reference recordings
                      </Typography>
                    </Stack>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  setImportPlacement('backing');
                  setImportOpen(true);
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.35 }}>
                  <GraphicEqIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Import backing from playlists"
                  primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35 } }}
                  secondaryTypographyProps={{ component: 'div', sx: { mt: 0.85 } }}
                  secondary={
                    <Stack
                      component="span"
                      direction="row"
                      alignItems="center"
                      spacing={1.25}
                      aria-label="Spotify and YouTube playlists. Saves to backing tracks."
                    >
                      <SpotifyBrandIcon sx={{ fontSize: 18, display: 'block', flexShrink: 0 }} aria-hidden />
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ lineHeight: 0 }}>
                        ·
                      </Typography>
                      <YouTubeBrandIcon sx={{ fontSize: 18, display: 'block', flexShrink: 0 }} aria-hidden />
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ pl: 0.25 }}>
                        → backing tracks
                      </Typography>
                    </Stack>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  setBulkPerfOpen(true);
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.35 }}>
                  <CloudUploadIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35 } }}
                  primary="Bulk import videos"
                  secondaryTypographyProps={{ sx: { mt: 0.85 } }}
                  secondary="Drive folder or files"
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setImportMenuAnchor(null);
                  setBulkScoreOpen(true);
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.35 }}>
                  <DescriptionOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ sx: { fontWeight: 600, lineHeight: 1.35 } }}
                  primary="Bulk import scores"
                  secondaryTypographyProps={{ sx: { mt: 0.85 } }}
                  secondary="PDF, MusicXML, MIDI"
                />
              </MenuItem>
            </Menu>
          </>
        }
      />

      {songs.length > 0 ? (
        <Box sx={{ mb: { xs: 4, sm: 5 } }}>
          <Stack spacing={2.5}>
            <EncoreToolbarRow sx={{ mb: 0 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search title, artist, venue, key…"
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
              <Box sx={{ flexGrow: 1 }} aria-hidden />
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
                <Tooltip title="Table view">
                  <ToggleButton value="table" aria-label="Table view">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Grid view">
                  <ToggleButton value="grid" aria-label="Grid view">
                    <ViewModuleIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </EncoreToolbarRow>

            <Box>
              <Stack spacing={1.5}>
                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                  <Typography
                    variant="caption"
                    sx={{ ...encoreMutedCaptionSx, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 96 } }}
                  >
                    Performances
                  </Typography>
                  {(
                    [
                      { id: 'all' as const, label: 'All songs' },
                      { id: 'with' as const, label: 'With performances' },
                      { id: 'none' as const, label: 'None yet' },
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
                    sx={{ ...encoreMutedCaptionSx, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 96 } }}
                  >
                    Status
                  </Typography>
                  {(
                    [
                      { id: 'all' as const, label: 'All songs' },
                      { id: 'practicing' as const, label: 'Currently practicing' },
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
                    <Typography
                      variant="caption"
                      sx={{ ...encoreMutedCaptionSx, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 96 } }}
                    >
                      Venue
                    </Typography>
                    {venueChipOptions.map((v) => (
                      <Chip
                        key={v}
                        size="small"
                        label={v}
                        clickable
                        color={venueFilter === v ? 'primary' : 'default'}
                        variant={venueFilter === v ? 'filled' : 'outlined'}
                        onClick={() => setVenueFilter((cur) => (cur === v ? null : v))}
                      />
                    ))}
                  </Stack>
                ) : null}

                {hasActiveFilters ? (
                  <Stack direction="row" gap={1} alignItems="center" sx={{ alignSelf: 'flex-start' }}>
                    <Button size="small" variant="text" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </Box>
      ) : null}

      {songs.length === 0 && (
        <Stack spacing={2} sx={{ py: 5, alignItems: 'center', px: 2, maxWidth: 560, mx: 'auto' }}>
          <Typography color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65 }}>
            Nothing here yet — add a song to start. Data stays on this device until you sign in to Google for Drive
            sync (Account menu).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65, maxWidth: 480 }}>
            The fastest way to build your library is usually a playlist import. Spotify titles and artists are the
            most structured, so starting with a Spotify playlist (then adding YouTube playlists in the same import if
            you want) tends to match more reliably than YouTube-only.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center" sx={{ width: 1 }}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddSongOpen(true)} sx={{ textTransform: 'none' }}>
              Add song
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<QueueMusicIcon />}
              onClick={() => {
                setImportPlacement('reference');
                setImportOpen(true);
              }}
              sx={{ textTransform: 'none' }}
            >
              Import from playlists
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MenuBookOutlinedIcon />}
              onClick={() => navigateEncore({ kind: 'help' })}
              sx={{ textTransform: 'none' }}
            >
              Import guide (Help)
            </Button>
          </Stack>
        </Stack>
      )}
      {songs.length > 0 && repertoireSongs.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2, lineHeight: 1.55 }}>
          No matches. Clear filters or try a shorter search.
        </Typography>
      ) : null}

      {repertoireSongs.length > 0 && viewMode === 'table' && selectedSongIds.size > 0 ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          flexWrap="wrap"
          useFlexGap
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedSongIds.size} selected
          </Typography>
          <Button size="small" variant="outlined" onClick={() => void bulkSetPracticing(true)}>
            Mark currently practicing
          </Button>
          <Button size="small" variant="outlined" onClick={() => void bulkSetPracticing(false)}>
            Clear practicing
          </Button>
          <Button size="small" variant="outlined" onClick={() => setBulkTagOpen(true)}>
            Add tag…
          </Button>
          <Button size="small" color="error" variant="outlined" onClick={() => setBulkDeleteOpen(true)}>
            Remove from library…
          </Button>
          <Button size="small" variant="text" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </Stack>
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
            gap: { xs: 2, sm: 2.5 },
          }}
        >
          {repertoireSongs.map((s) => {
            const perfs = perfBySong.get(s.id) ?? [];
            const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
            const keyDisplay = s.performanceKey?.trim() || '';
            const metaLine = keyDisplay;
            return (
              <Card
                key={s.id}
                elevation={0}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: encoreRadius,
                  bgcolor: 'background.paper',
                  border: 'none',
                  boxShadow: encoreShadowSurface,
                  transition: (t) => t.transitions.create(['box-shadow', 'transform'], { duration: 200 }),
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(76, 29, 149, 0.08)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <CardActionArea onClick={() => openSong(s)} sx={{ flex: 1, alignItems: 'stretch' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', pb: 1 }}>
                    {s.albumArtUrl ? (
                      <Box
                        component="img"
                        src={s.albumArtUrl}
                        alt=""
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: encoreRadius,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          ...encoreNoAlbumArtSurfaceSx(theme),
                          width: 72,
                          height: 72,
                          borderRadius: encoreRadius,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 30 }} aria-hidden />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
                        noWrap
                      >
                        {s.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {s.artist}
                      </Typography>
                      {metaLine ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
                          noWrap
                        >
                          {metaLine}
                        </Typography>
                      ) : null}
                      {s.practicing ? (
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label="Currently practicing"
                          sx={{ mt: 0.75, height: 22, fontWeight: 600 }}
                        />
                      ) : null}
                      <InlineSongTagsCell
                        compact
                        sx={{ mt: 0.75, maxWidth: '100%' }}
                        tags={s.tags ?? []}
                        suggestions={tagFilterOptions}
                        onCommit={(next) => {
                          void saveSong({
                            ...s,
                            tags: next.length ? next : undefined,
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                      />
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
          Add performance
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

      <AddSongDialog open={addSongOpen} onClose={() => setAddSongOpen(false)} />
      <PlaylistImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        googleAccessToken={googleAccessToken}
        spotifyLinked={spotifyLinked}
        existingSongs={songs}
        onSaveSong={saveSong}
        importPlacement={importPlacement}
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
      <BulkScoreImportDialog
        open={bulkScoreOpen}
        onClose={() => setBulkScoreOpen(false)}
        songs={songs}
        onSaveSong={saveSong}
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

      <Dialog open={bulkTagOpen} onClose={() => setBulkTagOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>Add tag to {selectedSongIds.size} songs</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <TextField
            margin="dense"
            label="Tag"
            fullWidth
            value={bulkTagInput}
            onChange={(e) => setBulkTagInput(e.target.value)}
            placeholder="e.g. Wedding"
          />
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkTagOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void bulkAddTag()} disabled={!bulkTagInput.trim()}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogTitle sx={encoreDialogTitleSx}>Remove {selectedSongIds.size} songs?</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary">
            This deletes the songs from your library on this device (and from Drive after the next sync). Performances
            linked to these songs may become orphaned.
          </Typography>
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void bulkRemoveSongs()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
