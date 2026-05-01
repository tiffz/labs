/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'material-react-table';
import {
  ENCORE_ACCOMPANIMENT_TAGS,
  type EncoreAccompanimentTag,
  type EncorePerformance,
  type EncoreSong,
} from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { useEncore } from '../context/EncoreContext';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';
import { InlineChipDate, InlineChipMultiSelect, InlineChipSelect } from '../ui/InlineEditChip';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';

type PerformancesViewMode = 'table' | 'grid';
const VIEW_STORAGE_KEY = 'encore.performances.view';

type PerfMrtRow = {
  perf: EncorePerformance;
  song: EncoreSong | null;
  date: string;
  songLabel: string;
  artistLabel: string;
  venue: string;
  accompaniment: EncoreAccompanimentTag[];
};

function formatPerformanceNotesLine(notes: string, maxLen = 72): string {
  const t = notes.trim();
  if (!t) return '';
  const stripped = t.replace(/^Imported:\s*/i, '').trim();
  const base = stripped || t;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

export function PerformancesScreen(): React.ReactElement {
  const theme = useTheme();
  const {
    songs,
    performances,
    savePerformance,
    deletePerformance,
    googleAccessToken,
    repertoireExtras,
    effectiveDisplayName,
  } = useEncore();
  const [query, setQuery] = useState('');
  const [pickSongOpen, setPickSongOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState('');
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PerformancesViewMode>(() => {
    if (typeof window === 'undefined') return 'table';
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'table';
  });
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [bulkVenueOpen, setBulkVenueOpen] = useState(false);
  const [bulkVenueDraft, setBulkVenueDraft] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'grid') setRowSelection({});
  }, [viewMode]);

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
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [repertoireExtras.venueCatalog, performances]);

  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s] as const)), [songs]);

  const hasAnyPerformanceVideoLink = useMemo(
    () => performances.some((p) => Boolean(performanceVideoOpenUrl(p))),
    [performances],
  );

  const data = useMemo<PerfMrtRow[]>(() => {
    const q = query.trim().toLowerCase();
    const all = performances.map((p) => {
      const song = songById.get(p.songId) ?? null;
      return {
        perf: p,
        song,
        date: p.date,
        songLabel: song?.title ?? 'Unknown song',
        artistLabel: song?.artist ?? '',
        venue: p.venueTag.trim() || 'Venue',
        accompaniment: p.accompanimentTags ?? [],
      };
    });
    if (!q) return all;
    return all.filter((r) => {
      const hay = [r.songLabel, r.artistLabel, r.venue, r.date, r.perf.notes ?? ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [performances, songById, query]);

  const selectedPerfIds = useMemo(
    () => new Set(Object.keys(rowSelection).filter((id) => rowSelection[id])),
    [rowSelection],
  );

  const applyBulkVenue = useCallback(async () => {
    const v = bulkVenueDraft.trim();
    if (!v) return;
    const now = new Date().toISOString();
    for (const row of data) {
      if (!selectedPerfIds.has(row.perf.id)) continue;
      await savePerformance({ ...row.perf, venueTag: v, updatedAt: now });
    }
    setBulkVenueOpen(false);
    setBulkVenueDraft('');
    setRowSelection({});
  }, [bulkVenueDraft, data, selectedPerfIds, savePerformance]);

  const applyBulkDelete = useCallback(async () => {
    for (const id of selectedPerfIds) {
      await deletePerformance(id);
    }
    setBulkDeleteOpen(false);
    setRowSelection({});
  }, [deletePerformance, selectedPerfIds]);

  const updatePerformance = async (next: EncorePerformance) => {
    const now = new Date().toISOString();
    await savePerformance({ ...next, updatedAt: now });
  };

  const openEdit = (p: EncorePerformance) => {
    setPerfEditing(p);
    setPerfSongId(p.songId);
    setPerfOpen(true);
  };

  const columns = useMemo<MRT_ColumnDef<PerfMrtRow>[]>(() => [
    {
      id: 'video',
      header: 'Video',
      size: 120,
      enableColumnFilter: false,
      enableSorting: false,
      Cell: ({ row }) => {
        const url = performanceVideoOpenUrl(row.original.perf);
        const thumb = (
          <PerformanceVideoThumb performance={row.original.perf} width={100} alt="" googleAccessToken={googleAccessToken} />
        );
        if (url) {
          return (
            <Box
              component="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open performance video"
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'inline-flex',
                borderRadius: 1,
                lineHeight: 0,
                textDecoration: 'none',
                color: 'inherit',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              {thumb}
            </Box>
          );
        }
        return (
          <Box sx={{ lineHeight: 0 }} aria-label="No video link">
            {thumb}
          </Box>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      size: 160,
      enableColumnFilter: false,
      Cell: ({ row }) => (
        <InlineChipDate
          value={row.original.date}
          placeholder="Set date"
          onChange={(d) => {
            if (!d) return;
            void updatePerformance({ ...row.original.perf, date: d });
          }}
        />
      ),
    },
    {
      accessorKey: 'songLabel',
      header: 'Song',
      enableColumnFilter: false,
      Cell: ({ row }) => {
        const { song, artistLabel, perf } = row.original;
        return (
          <Box>
            <Button
              variant="text"
              size="small"
              disabled={!song}
              onClick={() => song && navigateEncore({ kind: 'song', id: song.id })}
              sx={{
                textAlign: 'left',
                justifyContent: 'flex-start',
                fontWeight: 600,
                textTransform: 'none',
                p: 0,
                minWidth: 0,
                color: 'text.primary',
                '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
              }}
            >
              {row.original.songLabel}
            </Button>
            {artistLabel ? (
              <Typography variant="caption" color="text.secondary" display="block">
                {artistLabel}
              </Typography>
            ) : null}
            {perf.notes ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                title={perf.notes}
                sx={{ mt: 0.25, lineHeight: 1.4 }}
              >
                {formatPerformanceNotesLine(perf.notes)}
              </Typography>
            ) : null}
          </Box>
        );
      },
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      filterVariant: 'multi-select',
      filterSelectOptions: venueOptions,
      Cell: ({ row }) => (
        <InlineChipSelect<string>
          value={row.original.venue}
          options={venueOptions}
          freeSolo
          placeholder="Venue"
          onChange={(v) => {
            if (v == null) return;
            void updatePerformance({ ...row.original.perf, venueTag: v });
          }}
        />
      ),
    },
    {
      accessorKey: 'accompaniment',
      header: 'Accompaniment',
      filterVariant: 'multi-select',
      filterSelectOptions: [...ENCORE_ACCOMPANIMENT_TAGS],
      filterFn: (row, _columnId, filterValue: unknown) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        const cellTags = row.original.accompaniment;
        return (filterValue as string[]).some((v) => cellTags.includes(v as EncoreAccompanimentTag));
      },
      Cell: ({ row }) => (
        <InlineChipMultiSelect<EncoreAccompanimentTag>
          values={row.original.accompaniment}
          options={ENCORE_ACCOMPANIMENT_TAGS}
          placeholder="Add tags"
          onChange={(arr) => {
            void updatePerformance({
              ...row.original.perf,
              accompanimentTags: arr.length ? arr : undefined,
            });
          }}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 56,
      enableColumnFilter: false,
      enableSorting: false,
      muiTableHeadCellProps: { sx: { textAlign: 'right' } },
      muiTableBodyCellProps: { sx: { textAlign: 'right' } },
      Cell: ({ row }) => (
        <IconButton size="small" aria-label="Edit performance" onClick={() => openEdit(row.original.perf)}>
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [venueOptions, googleAccessToken]);

  const table = useMaterialReactTable<PerfMrtRow>({
    columns,
    data,
    getRowId: (row) => row.perf.id,
    ...encoreMrtRepertoireTableOptions<PerfMrtRow>(),
    enableColumnFilters: true,
    enableRowSelection: viewMode === 'table',
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    mrtTheme: {
      baseBackgroundColor: theme.palette.background.paper,
    },
    muiTableBodyRowProps: () => ({
      sx: (t) => ({
        '&:nth-of-type(even)': { bgcolor: alpha(t.palette.action.hover, 0.35) },
        '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.06) },
      }),
    }),
    initialState: {
      density: 'compact',
      showColumnFilters: false,
      sorting: [{ id: 'date', desc: true }],
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
        title={encorePossessivePageTitle(effectiveDisplayName, 'performances')}
        description="Every show you have logged. Open a song for charts, milestones, and notes."
        actions={
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setPickSongOpen(true)}>
            Add performance
          </Button>
        }
      />

      {performances.length > 0 && !hasAnyPerformanceVideoLink ? (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
            None of your performances have a linked video yet. To attach many files at once, go to{' '}
            <Link component="button" type="button" onClick={() => navigateEncore({ kind: 'library' })} sx={{ fontSize: 'inherit' }}>
              Repertoire
            </Link>
            , then <strong>Add</strong>, <strong>Import</strong>, <strong>Bulk import videos</strong>. Encore renames
            files in your Performances folder to match the suggested pattern in{' '}
            <Link component="button" type="button" onClick={() => navigateEncore({ kind: 'help' })} sx={{ fontSize: 'inherit' }}>
              Help: Import guide
            </Link>
            .
          </Typography>
        </Alert>
      ) : null}

      <EncoreToolbarRow>
        <TextField
          size="small"
          fullWidth
          placeholder="Search song, artist, venue, date…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputProps={{ 'aria-label': 'Search performances' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" aria-hidden />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: { sm: 440 } }}
        />
        <Box sx={{ flexGrow: 1 }} aria-hidden />
        <Button
          size="small"
          variant="text"
          onClick={() => table.setShowColumnFilters((cur) => !cur)}
          sx={{ flexShrink: 0 }}
        >
          {table.getState().showColumnFilters ? 'Hide filters' : 'Filters'}
        </Button>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_e, next: PerformancesViewMode | null) => {
            if (next) setViewMode(next);
          }}
          aria-label="Performances layout"
          sx={{ flexShrink: 0 }}
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

      {performances.length > 0 && viewMode === 'table' && selectedPerfIds.size > 0 ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          flexWrap="wrap"
          useFlexGap
          sx={{
            mt: 2,
            mb: 1,
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedPerfIds.size} selected
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setBulkVenueOpen(true)}>
            Set venue…
          </Button>
          <Button size="small" color="error" variant="outlined" onClick={() => setBulkDeleteOpen(true)}>
            Delete…
          </Button>
          <Button size="small" variant="text" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </Stack>
      ) : null}

      {performances.length === 0 && songs.length === 0 ? (
        <Stack spacing={1.5} sx={{ py: 4, maxWidth: 520 }}>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Nothing here yet — add songs from Repertoire first, then log a performance from a song page or tap{' '}
            <strong>Add performance</strong> above.
          </Typography>
          <Button variant="outlined" size="small" onClick={() => navigateEncore({ kind: 'library' })} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Go to repertoire
          </Button>
        </Stack>
      ) : performances.length === 0 && songs.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            py: 3,
            px: { xs: 2.5, sm: 3.5 },
            maxWidth: 640,
            borderRadius: encoreRadius,
            boxShadow: encoreShadowSurface,
            border: 'none',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5 }}>
            Bring in performance videos
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
            You have songs but no performances yet. Use bulk import from Drive to attach many videos at once. Encore
            matches each file to a song from the name and folder path, then keeps Drive names aligned with this
            pattern when it organizes your Performances folder:
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              mb: 2.5,
              p: 1.5,
              borderRadius: 1,
              borderLeft: 4,
              borderColor: 'primary.main',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {'YYYY-MM-DD - Song title - Artist.mp4'}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 2 }}>
            Put the performance date first, then the title, then the artist. Use Drive folder names like{' '}
            <Typography component="span" sx={{ fontFamily: 'ui-monospace, monospace' }}>
              Venue - Martuni&apos;s
            </Typography>{' '}
            to tag venue (and other metadata) for a whole folder — see Help.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" onClick={() => navigateEncore({ kind: 'library' })} sx={{ textTransform: 'none' }}>
              Go to repertoire to import
            </Button>
            <Button variant="outlined" onClick={() => navigateEncore({ kind: 'help' })} sx={{ textTransform: 'none' }}>
              Open import guide
            </Button>
          </Stack>
        </Paper>
      ) : viewMode === 'table' ? (
        <Box sx={{ mt: 2 }}>
          <MaterialReactTable table={table} />
        </Box>
      ) : (
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {data.map(({ perf, song, date, venue }) => {
            const url = performanceVideoOpenUrl(perf);
            return (
              <Card
                key={perf.id}
                elevation={0}
                sx={{
                  borderRadius: encoreRadius,
                  bgcolor: 'background.paper',
                  border: 'none',
                  boxShadow: encoreShadowSurface,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ aspectRatio: '16/9', bgcolor: 'background.default' }}>
                  {url ? (
                    <Box
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open performance video"
                      sx={{ display: 'block', lineHeight: 0, height: '100%', textDecoration: 'none', color: 'inherit' }}
                    >
                      <PerformanceVideoThumb performance={perf} fluid alt="" googleAccessToken={googleAccessToken} />
                    </Box>
                  ) : (
                    <PerformanceVideoThumb performance={perf} fluid alt="" googleAccessToken={googleAccessToken} />
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {date}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    component="button"
                    onClick={() => song && navigateEncore({ kind: 'song', id: song.id })}
                    disabled={!song}
                    sx={{
                      display: 'block',
                      textAlign: 'left',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: song ? 'pointer' : 'default',
                      fontWeight: 600,
                      mt: 0.25,
                      color: 'text.primary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    {song?.title ?? 'Unknown song'}
                  </Typography>
                  {song?.artist ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {song.artist}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.primary" sx={{ mt: 1, fontWeight: 500 }}>
                    {venue}
                  </Typography>
                  {(perf.accompanimentTags ?? []).length > 0 ? (
                    <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {(perf.accompanimentTags ?? []).map((t) => (
                        <Box
                          key={t}
                          sx={{
                            fontSize: '0.7rem',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 999,
                            color: 'text.secondary',
                            border: 1,
                            borderColor: 'divider',
                          }}
                        >
                          {t}
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end">
                    <IconButton size="small" aria-label="Edit performance" onClick={() => openEdit(perf)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      <LibrarySongPickerDialog
        open={pickSongOpen}
        onClose={() => {
          setPickSongOpen(false);
          setPickQuery('');
        }}
        existingSongs={songs}
        incoming={null}
        pickQuery={pickQuery}
        onPickQueryChange={setPickQuery}
        onSelect={(s) => {
          setPickSongOpen(false);
          setPickQuery('');
          setPerfEditing(null);
          setPerfSongId(s.id);
          setPerfOpen(true);
        }}
        linkedOnOtherRow={() => false}
        emptyLibraryHint="Your library is empty. Add a song from Repertoire first."
        emptySearchHint="No songs match that search."
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
          onSave={async (perf) => {
            await savePerformance(perf);
          }}
        />
      )}

      <Dialog open={bulkVenueOpen} onClose={() => setBulkVenueOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>Set venue ({selectedPerfIds.size})</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <TextField
            margin="dense"
            label="Venue"
            fullWidth
            value={bulkVenueDraft}
            onChange={(e) => setBulkVenueDraft(e.target.value)}
            helperText={venueOptions.length ? `Suggestions include: ${venueOptions.slice(0, 4).join(', ')}` : undefined}
          />
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkVenueOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void applyBulkVenue()} disabled={!bulkVenueDraft.trim()}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogTitle sx={encoreDialogTitleSx}>Delete {selectedPerfIds.size} performances?</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary">
            This removes the performance entries from your log. Linked videos in Drive are not deleted
            automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void applyBulkDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
