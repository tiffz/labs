/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import {
  ENCORE_ACCOMPANIMENT_TAGS,
  type EncoreAccompanimentTag,
  type EncorePerformance,
  type EncoreSong,
} from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { useEncore } from '../context/EncoreContext';
import { encoreMaxWidthPage, encoreRadius, encoreShadowSurface } from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';
import { InlineChipDate, InlineChipMultiSelect, InlineChipSelect } from '../ui/InlineEditChip';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';

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
  const { songs, performances, savePerformance, googleAccessToken, repertoireExtras } = useEncore();
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

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
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
      filterSelectOptions: ENCORE_ACCOMPANIMENT_TAGS as unknown as string[],
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
        title="Performances"
        description="Every show you have logged. Open a song for charts, milestones, and notes."
        actions={
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setPickSongOpen(true)}>
            Add performance
          </Button>
        }
      />

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

      {performances.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, lineHeight: 1.6 }}>
          No performances yet. Add one from a song, or tap <strong>Add performance</strong> above.
        </Typography>
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
    </Box>
  );
}
