/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_RowSelectionState,
} from 'material-react-table';
import {
  ENCORE_ACCOMPANIMENT_TAGS,
  type EncoreAccompanimentTag,
  type EncoreMrtTablePrefs,
  type EncorePerformance,
  type EncoreSong,
} from '../types';
import {
  encoreAppHref,
  isModifiedOrNonPrimaryClick,
  navigateEncore,
  openEncoreRouteInBackgroundTab,
  parseEncoreAppHash,
} from '../routes/encoreAppHash';
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
import { BulkPerformanceImportDialog } from './BulkPerformanceImportDialog';
import { BulkScoreImportDialog } from './BulkScoreImportDialog';
import { PlaylistImportDialog } from './PlaylistImportDialog';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PerformancesWrappedScreen } from './PerformancesWrappedScreen';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { PerformanceVideoThumb } from './PerformanceVideoThumb';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';
import {
  LEGACY_MRT_ACTIONS_DATA_COL,
  MRT_ROW_SELECT_COL,
  MRT_ROW_SPACER_COL,
  ensureEncoreMrtRowActionsInOrder,
  ensureEncoreMrtSelectLeading,
  migrateEncoreMrtColumnOrderIds,
  migrateEncoreMrtColumnVisibility,
  normalizeEncoreMrtColumnOrder,
  withEncoreMrtTrailingSpacer,
} from './encoreMrtColumnOrder';
import { InlineChipDate, InlineChipMultiSelect, InlineChipSelect } from '../ui/InlineEditChip';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';
import {
  EncoreFilterChipBar,
  type EncoreFilterChipBarHandle,
  type EncoreFilterFieldConfig,
} from '../ui/EncoreFilterChipBar';
import { EncoreMrtColumnHeader } from '../ui/EncoreMrtColumnHeader';
import { EncoreMrtColumnsSettingsButton } from '../ui/EncoreMrtColumnsSettingsButton';
import { ENCORE_FILTER_SENTINEL } from '../utils/encoreFilterSentinels';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';
import { useDebouncedString } from '../utils/useDebouncedString';
import { HighlightedText } from '../ui/HighlightedText';
import {
  buildExtendedPerformanceInsights,
  buildPerformanceDashboardStats,
} from '../performances/performancesStatsModel';
import AppTooltip from '../../shared/components/AppTooltip';

type PerformancesViewMode = 'table' | 'grid';
const VIEW_STORAGE_KEY = 'encore.performances.view';

const PERFORMANCES_FILTER_PINNED = ['venue', 'accompaniment'] as const;

function normalizePerfVenueLabel(tag: string): string {
  return tag.trim() || 'Venue';
}

type PerfMrtRow = {
  perf: EncorePerformance;
  song: EncoreSong | null;
  date: string;
  songLabel: string;
  artistLabel: string;
  venue: string;
  accompaniment: EncoreAccompanimentTag[];
};

const getPerfRowId = (row: PerfMrtRow): string => row.perf.id;

/** Older prefs defaulted to song title A→Z; replace with newest-first date for Activity. */
function normalizePerformancesTableSorting(
  sorting: Array<{ id: string; desc: boolean }> | undefined,
): Array<{ id: string; desc: boolean }> {
  const def = [{ id: 'date', desc: true }];
  if (!sorting?.length) return def;
  if (sorting.length === 1 && sorting[0]?.id === 'songLabel' && sorting[0]?.desc === false) return def;
  return sorting;
}

/** Controlled column order for MRT: prefs only list data columns; inject display columns so checkboxes stay first. */
function performancesColumnOrderForMrt(
  viewMode: PerformancesViewMode,
  perfColOrder: string[] | undefined,
  perfDefaultColumnOrder: string[],
): string[] {
  const base = perfColOrder ?? perfDefaultColumnOrder;
  if (viewMode !== 'table') {
    return withEncoreMrtTrailingSpacer(
      normalizeEncoreMrtColumnOrder(
        ensureEncoreMrtRowActionsInOrder(base.filter((id) => id !== MRT_ROW_SELECT_COL)),
      ),
    );
  }
  const withSelect = base.includes(MRT_ROW_SELECT_COL) ? base : [MRT_ROW_SELECT_COL, ...base];
  const withActions = ensureEncoreMrtRowActionsInOrder(withSelect);
  const normalized = normalizeEncoreMrtColumnOrder(withActions);
  return withEncoreMrtTrailingSpacer(ensureEncoreMrtSelectLeading(normalized));
}

function perfMrtColumnId(c: MRT_ColumnDef<PerfMrtRow>): string {
  if (c.id) return c.id;
  if (typeof c.accessorKey === 'string') return c.accessorKey;
  if (c.accessorKey != null) return String(c.accessorKey);
  return '';
}

function formatPerformanceNotesLine(notes: string, maxLen = 72): string {
  const t = notes.trim();
  if (!t) return '';
  const stripped = t.replace(/^Imported:\s*/i, '').trim();
  const base = stripped || t;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

const PerformancesSearchHighlightContext = createContext('');

function PerfSongColumnCell({ row }: { row: MRT_Row<PerfMrtRow> }): ReactElement {
  const highlight = useContext(PerformancesSearchHighlightContext);
  const { song, artistLabel, perf } = row.original;
  return (
    <Box>
      <Button
        variant="text"
        size="small"
        disabled={!song}
        component={song ? 'a' : 'button'}
        href={song ? encoreAppHref({ kind: 'song', id: song.id }) : undefined}
        sx={{
          textAlign: 'left',
          justifyContent: 'flex-start',
          fontWeight: 600,
          textTransform: 'none',
          p: 0,
          minWidth: 0,
          maxWidth: '100%',
          color: 'text.primary',
          '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
        }}
      >
        <AppTooltip title={row.original.songLabel}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
            <HighlightedText
              text={row.original.songLabel}
              highlight={highlight}
              variant="body2"
              sx={{
                fontWeight: 600,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          </Box>
        </AppTooltip>
      </Button>
      {artistLabel ? (
        <AppTooltip title={artistLabel}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
            <HighlightedText
              text={artistLabel}
              highlight={highlight}
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          </Box>
        </AppTooltip>
      ) : null}
      {perf.notes ? (
        <AppTooltip title={perf.notes}>
          <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%', mt: 0.25 }}>
            <HighlightedText
              text={formatPerformanceNotesLine(perf.notes)}
              highlight={highlight}
              variant="caption"
              sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
            />
          </Box>
        </AppTooltip>
      ) : null}
    </Box>
  );
}

function subscribePerformancesSubTab(onStoreChange: () => void): () => void {
  window.addEventListener('hashchange', onStoreChange);
  return () => window.removeEventListener('hashchange', onStoreChange);
}

function getPerformancesSubTabSnapshot(): 'list' | 'wrapped' {
  if (typeof window === 'undefined') return 'list';
  const route = parseEncoreAppHash(window.location.hash);
  if (route.kind !== 'performances') return 'list';
  return route.tab === 'wrapped' ? 'wrapped' : 'list';
}

export function PerformancesScreen(): ReactElement {
  const theme = useTheme();
  const {
    songs,
    performances,
    savePerformance,
    deletePerformance,
    saveSong,
    bulkSavePerformances,
    bulkDeletePerformances,
    googleAccessToken,
    spotifyLinked,
    repertoireExtras,
    saveRepertoireExtras,
    effectiveDisplayName,
  } = useEncore();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedString(query, 220);
  const [perfFilterValues, setPerfFilterValues] = useState<Record<string, string[]>>(() => ({
    venue: [],
    accompaniment: [],
    year: [],
    song: [],
  }));
  const [visiblePerfFilterIds, setVisiblePerfFilterIds] = useState<string[]>([
    ...PERFORMANCES_FILTER_PINNED,
  ]);
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
  const [bulkAccOpen, setBulkAccOpen] = useState(false);
  const [bulkAccDraft, setBulkAccDraft] = useState<EncoreAccompanimentTag[]>([]);
  /**
   * Bulk-accompaniment apply mode:
   *  - 'replace': set the selected performances' accompaniment to exactly the picked tags
   *  - 'add':     union the picked tags into each performance's existing accompaniment list
   * Default to 'replace' because picking from an empty draft + 'add' is a no-op surprise.
   */
  const [bulkAccMode, setBulkAccMode] = useState<'replace' | 'add'>('replace');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkOverflowAnchor, setBulkOverflowAnchor] = useState<HTMLElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPlacement, setImportPlacement] = useState<'reference' | 'backing'>('reference');
  const [bulkPerfImportOpen, setBulkPerfImportOpen] = useState(false);
  const [bulkScoreOpen, setBulkScoreOpen] = useState(false);
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);
  const extrasRef = useRef(repertoireExtras);
  extrasRef.current = repertoireExtras;

  const performancesSubTab = useSyncExternalStore(
    subscribePerformancesSubTab,
    getPerformancesSubTabSnapshot,
    () => 'list',
  );

  const perfFilterBarRef = useRef<EncoreFilterChipBarHandle>(null);

  const [perfColVis, setPerfColVis] = useState<Record<string, boolean>>({});
  const [perfColOrder, setPerfColOrder] = useState<string[] | undefined>(undefined);
  const [perfSorting, setPerfSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'date', desc: true },
  ]);

  const lastAppliedPerfTableRef = useRef<EncoreMrtTablePrefs | null>(null);
  const perfLegacySortFixSentRef = useRef(false);
  const perfLegacyColumnIdsMigratedRef = useRef(false);

  const persistPerformancesTablePrefs = useCallback(
    (patch: Partial<EncoreMrtTablePrefs>) => {
      const cur = extrasRef.current.tableUi ?? {};
      const nextPerf: EncoreMrtTablePrefs = { ...(cur.performances ?? {}), ...patch };
      void saveRepertoireExtras({ tableUi: { ...cur, performances: nextPerf } });
    },
    [saveRepertoireExtras],
  );

  useEffect(() => {
    const r = repertoireExtras.tableUi?.performances;
    if (!r) return;
    if (lastAppliedPerfTableRef.current === r) return;
    lastAppliedPerfTableRef.current = r;
    const normalizedSort = normalizePerformancesTableSorting(r.sorting?.length ? r.sorting : undefined);
    const rawOrder = r.columnOrder;
    const migratedOrder =
      rawOrder?.length
        ? normalizeEncoreMrtColumnOrder(migrateEncoreMrtColumnOrderIds(rawOrder))
        : undefined;
    const migratedVis = migrateEncoreMrtColumnVisibility(r.columnVisibility ?? {});
    setPerfColVis(migratedVis);
    setPerfColOrder(migratedOrder);
    setPerfSorting(normalizedSort);
    const needsLegacyColumnPersist =
      (rawOrder?.includes(LEGACY_MRT_ACTIONS_DATA_COL) ?? false) ||
      (r.columnVisibility != null &&
        Object.prototype.hasOwnProperty.call(r.columnVisibility, LEGACY_MRT_ACTIONS_DATA_COL));
    if (needsLegacyColumnPersist && !perfLegacyColumnIdsMigratedRef.current) {
      perfLegacyColumnIdsMigratedRef.current = true;
      persistPerformancesTablePrefs({
        columnOrder: migratedOrder,
        columnVisibility: migratedVis,
      });
    }
    const isLegacySongAsc =
      r.sorting?.length === 1 && r.sorting[0].id === 'songLabel' && r.sorting[0].desc === false;
    if (isLegacySongAsc && !perfLegacySortFixSentRef.current) {
      perfLegacySortFixSentRef.current = true;
      persistPerformancesTablePrefs({ sorting: normalizedSort });
    }
  }, [repertoireExtras.tableUi, persistPerformancesTablePrefs]);

  const resetPerformancesTableLayout = useCallback(() => {
    lastAppliedPerfTableRef.current = null;
    setPerfColVis({});
    setPerfColOrder(undefined);
    const defSort = [{ id: 'date', desc: true }];
    setPerfSorting(defSort);
    persistPerformancesTablePrefs({
      columnVisibility: {},
      columnOrder: undefined,
      sorting: defSort,
    });
  }, [persistPerformancesTablePrefs]);

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

  const perfVenueFilterOptions = useMemo(() => {
    const s = new Set<string>(venueOptions);
    for (const p of performances) {
      s.add(normalizePerfVenueLabel(p.venueTag));
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [venueOptions, performances]);

  const performanceYearOptions = useMemo(() => {
    const ys = new Set<string>();
    for (const p of performances) {
      const y = p.date.slice(0, 4);
      if (/^\d{4}$/.test(y)) ys.add(y);
    }
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [performances]);

  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s] as const)), [songs]);

  const hasAnyPerformanceVideoLink = useMemo(
    () => performances.some((p) => Boolean(performanceVideoOpenUrl(p))),
    [performances],
  );

  const data = useMemo<PerfMrtRow[]>(() => {
    const venueChipFilters = perfFilterValues.venue ?? [];
    const accompanimentChipFilters = perfFilterValues.accompaniment ?? [];
    const yearChipFilters = perfFilterValues.year ?? [];
    const songChipFilters = perfFilterValues.song ?? [];
    const q = debouncedQuery.trim().toLowerCase();
    const all = performances.map((p) => {
      const song = songById.get(p.songId) ?? null;
      return {
        perf: p,
        song,
        date: p.date,
        songLabel: song?.title ?? 'Unknown song',
        artistLabel: song?.artist ?? '',
        venue: normalizePerfVenueLabel(p.venueTag),
        accompaniment: p.accompanimentTags ?? [],
      };
    });
    let rows = all;
    if (songChipFilters.length > 0) {
      rows = rows.filter((r) =>
        songChipFilters.some((v) => (v === ENCORE_FILTER_SENTINEL.unknownSong ? r.song == null : false)),
      );
    }
    if (venueChipFilters.length > 0) {
      const blankVenue = venueChipFilters.includes(ENCORE_FILTER_SENTINEL.blankPerfVenue);
      const concreteVenues = venueChipFilters.filter((v) => v !== ENCORE_FILTER_SENTINEL.blankPerfVenue);
      rows = rows.filter((r) => {
        const rawEmpty = !r.perf.venueTag.trim();
        const matchBlank = blankVenue && rawEmpty;
        const matchConcrete = concreteVenues.length > 0 && concreteVenues.includes(r.venue);
        if (blankVenue && concreteVenues.length === 0) return rawEmpty;
        if (blankVenue && concreteVenues.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (accompanimentChipFilters.length > 0) {
      const blankAcc = accompanimentChipFilters.includes(ENCORE_FILTER_SENTINEL.blankAccompaniment);
      const concreteAcc = accompanimentChipFilters.filter((t) => t !== ENCORE_FILTER_SENTINEL.blankAccompaniment);
      rows = rows.filter((r) => {
        const noAcc = r.accompaniment.length === 0;
        const matchBlank = blankAcc && noAcc;
        const matchConcrete =
          concreteAcc.length > 0 &&
          concreteAcc.some((tag) => r.accompaniment.includes(tag as EncoreAccompanimentTag));
        if (blankAcc && concreteAcc.length === 0) return noAcc;
        if (blankAcc && concreteAcc.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (yearChipFilters.length > 0) {
      const blankYear = yearChipFilters.includes(ENCORE_FILTER_SENTINEL.blankYear);
      const concreteYears = yearChipFilters.filter((y) => y !== ENCORE_FILTER_SENTINEL.blankYear);
      rows = rows.filter((r) => {
        const head = r.date.slice(0, 4);
        const missingYear = !/^\d{4}$/.test(head);
        const matchBlank = blankYear && missingYear;
        const matchConcrete = concreteYears.length > 0 && concreteYears.some((y) => r.date.startsWith(y));
        if (blankYear && concreteYears.length === 0) return missingYear;
        if (blankYear && concreteYears.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.songLabel, r.artistLabel, r.venue, r.date, r.perf.notes ?? ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [
    performances,
    songById,
    debouncedQuery,
    perfFilterValues.song,
    perfFilterValues.venue,
    perfFilterValues.accompaniment,
    perfFilterValues.year,
  ]);

  const perfFilterFieldDefs = useMemo((): EncoreFilterFieldConfig[] => {
    const venueOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankPerfVenue, label: 'No venue set' },
      ...perfVenueFilterOptions.map((v) => ({ value: v, label: v })),
    ];
    const accOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankAccompaniment, label: 'Not set' },
      ...ENCORE_ACCOMPANIMENT_TAGS.map((t) => ({ value: t, label: t })),
    ];
    const yearOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankYear, label: 'Year not set' },
      ...performanceYearOptions.map((y) => ({ value: y, label: y })),
    ];
    return [
      { id: 'venue', label: 'Venue', options: venueOpts },
      { id: 'accompaniment', label: 'Accompaniment', options: accOpts },
      { id: 'year', label: 'Year', options: yearOpts },
      {
        id: 'song',
        label: 'Song',
        options: [{ value: ENCORE_FILTER_SENTINEL.unknownSong, label: 'Unknown in library' }],
      },
    ];
  }, [perfVenueFilterOptions, performanceYearOptions]);

  const perfAddableFilterFields = useMemo(() => {
    const pinned = new Set<string>(PERFORMANCES_FILTER_PINNED);
    return perfFilterFieldDefs.filter((f) => !pinned.has(f.id));
  }, [perfFilterFieldDefs]);

  const hasPerfChipFilters = Boolean(
    (perfFilterValues.venue ?? []).length > 0 ||
      (perfFilterValues.accompaniment ?? []).length > 0 ||
      (perfFilterValues.year ?? []).length > 0 ||
      (perfFilterValues.song ?? []).length > 0,
  );

  const clearPerfFilters = useCallback(() => {
    setPerfFilterValues({ venue: [], accompaniment: [], year: [], song: [] });
    setVisiblePerfFilterIds([...PERFORMANCES_FILTER_PINNED]);
  }, []);

  const onPerfFilterChange = useCallback((fieldId: string, nextValues: string[]) => {
    setPerfFilterValues((prev) => ({ ...prev, [fieldId]: nextValues }));
  }, []);

  const focusVenueFilter = useCallback((venueName: string) => {
    const v = venueName.trim();
    if (!v) return;
    setPerfFilterValues((prev) => ({ ...prev, venue: [v] }));
    setVisiblePerfFilterIds((ids) => (ids.includes('venue') ? ids : [...ids, 'venue']));
    navigateEncore({ kind: 'performances', tab: 'list' });
  }, []);

  const focusYearFilter = useCallback((year: string) => {
    if (!/^\d{4}$/.test(year)) return;
    setPerfFilterValues((prev) => ({ ...prev, year: [year] }));
    setVisiblePerfFilterIds((ids) => (ids.includes('year') ? ids : [...ids, 'year']));
    navigateEncore({ kind: 'performances', tab: 'list' });
  }, []);

  const hasActivePerfFilters = Boolean(query.trim() || hasPerfChipFilters);

  const selectedPerfIds = useMemo(
    () => new Set(Object.keys(rowSelection).filter((id) => rowSelection[id])),
    [rowSelection],
  );

  const applyBulkVenue = useCallback(async () => {
    const v = bulkVenueDraft.trim();
    if (!v) return;
    const now = new Date().toISOString();
    const updates = data
      .filter((row) => selectedPerfIds.has(row.perf.id))
      .map((row) => ({ ...row.perf, venueTag: v, updatedAt: now }));
    await bulkSavePerformances(updates);
    setBulkVenueOpen(false);
    setBulkVenueDraft('');
    setRowSelection({});
  }, [bulkVenueDraft, data, selectedPerfIds, bulkSavePerformances]);

  const applyBulkAccompaniment = useCallback(async () => {
    const now = new Date().toISOString();
    // Always sort by ENCORE_ACCOMPANIMENT_TAGS order so the saved value is canonical.
    const orderTags = (tags: ReadonlyArray<EncoreAccompanimentTag>): EncoreAccompanimentTag[] =>
      ENCORE_ACCOMPANIMENT_TAGS.filter((o) => tags.includes(o));
    const draftSet = new Set<EncoreAccompanimentTag>(bulkAccDraft);
    const updates = data
      .filter((row) => selectedPerfIds.has(row.perf.id))
      .map((row) => {
        const next: EncoreAccompanimentTag[] = (() => {
          if (bulkAccMode === 'replace') return orderTags([...draftSet]);
          // 'add' = union with existing
          const merged = new Set<EncoreAccompanimentTag>(row.perf.accompanimentTags ?? []);
          for (const tag of draftSet) merged.add(tag);
          return orderTags([...merged]);
        })();
        return {
          ...row.perf,
          accompanimentTags: next.length ? next : undefined,
          updatedAt: now,
        };
      });
    await bulkSavePerformances(updates);
    setBulkAccOpen(false);
    setBulkAccDraft([]);
    setBulkAccMode('replace');
    setRowSelection({});
  }, [bulkAccDraft, bulkAccMode, data, selectedPerfIds, bulkSavePerformances]);

  const applyBulkDelete = useCallback(async () => {
    await bulkDeletePerformances([...selectedPerfIds]);
    setBulkDeleteOpen(false);
    setRowSelection({});
  }, [bulkDeletePerformances, selectedPerfIds]);

  const updatePerformance = useCallback(
    async (next: EncorePerformance) => {
      const now = new Date().toISOString();
      await savePerformance({ ...next, updatedAt: now });
    },
    [savePerformance],
  );

  const openEdit = useCallback((p: EncorePerformance) => {
    setPerfEditing(p);
    setPerfSongId(p.songId);
    setPerfOpen(true);
  }, []);

  const performanceDashboardStats = useMemo(
    () => buildPerformanceDashboardStats(performances, songById, normalizePerfVenueLabel),
    [performances, songById],
  );
  const extendedPerformanceInsights = useMemo(
    () =>
      performanceDashboardStats
        ? buildExtendedPerformanceInsights(performances, songById, performanceDashboardStats)
        : null,
    [performances, songById, performanceDashboardStats],
  );

  const columns = useMemo<MRT_ColumnDef<PerfMrtRow>[]>(() => [
    {
      id: 'video',
      header: 'Video',
      Header: ({ column }) => <EncoreMrtColumnHeader label="Video" column={column} />,
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
      meta: { encoreFilterFieldId: 'year' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Date" column={column} filterBarRef={perfFilterBarRef} />
      ),
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
      meta: { encoreFilterFieldId: 'song' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Song" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 240,
      minSize: 180,
      enableColumnFilter: false,
      Cell: ({ row }) => <PerfSongColumnCell row={row} />,
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      meta: { encoreFilterFieldId: 'venue' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Venue" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 140,
      minSize: 120,
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
      meta: { encoreFilterFieldId: 'accompaniment' },
      Header: ({ column }) => (
        <EncoreMrtColumnHeader label="Accompaniment" column={column} filterBarRef={perfFilterBarRef} />
      ),
      size: 160,
      minSize: 140,
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
  ], [googleAccessToken, venueOptions, updatePerformance]);

  const perfTableBodyRowSx = useMemo(
    () => ({
      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
    }),
    [theme],
  );

  const perfDefaultColumnOrder = useMemo(
    () => columns.map((c) => perfMrtColumnId(c)).filter(Boolean),
    [columns],
  );

  const perfMrtBaseOptions = encoreMrtRepertoireTableOptions<PerfMrtRow>();
  const perfMrtTheme = useMemo(
    () => ({ baseBackgroundColor: theme.palette.background.paper }),
    [theme.palette.background.paper],
  );
  const perfDisplayColumnDefOptions = useMemo(
    () =>
      ({
        [MRT_ROW_SELECT_COL]: {
          enableColumnOrdering: false,
          size: 44,
          minSize: 40,
          maxSize: 56,
          muiTableHeadCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
          muiTableBodyCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
        },
        [MRT_ROW_SPACER_COL]: { enableColumnOrdering: false },
        'mrt-row-actions': {
          header: '',
          size: 48,
          minSize: 44,
          maxSize: 56,
          enableHiding: false,
          enableColumnActions: false,
          muiTableHeadCellProps: { sx: { textAlign: 'right' } },
          muiTableBodyCellProps: { sx: { textAlign: 'right' } },
        },
      }) as const,
    [],
  );
  const perfMrtState = useMemo(
    () => ({
      rowSelection,
      columnVisibility: perfColVis,
      columnOrder: performancesColumnOrderForMrt(viewMode, perfColOrder, perfDefaultColumnOrder),
      sorting: perfSorting,
    }),
    [rowSelection, perfColVis, perfColOrder, perfDefaultColumnOrder, perfSorting, viewMode],
  );
  const handlePerfColumnVisibilityChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<PerfMrtRow>>[0]['onColumnVisibilityChange']>>[0]) => {
      setPerfColVis((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
        persistPerformancesTablePrefs({ columnVisibility: next });
        return next;
      });
    },
    [persistPerformancesTablePrefs],
  );
  const handlePerfColumnOrderChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<PerfMrtRow>>[0]['onColumnOrderChange']>>[0]) => {
      setPerfColOrder((prev) => {
        // Must match the same effective order we pass in `state.columnOrder`, or TanStack's functional
        // updater receives the wrong "old" list when `mrt-row-spacer` / `mrt-row-select` were injected here
        // (and MRT's length-mismatch effect would otherwise persist a bad order after debounced column remounts).
        const base = performancesColumnOrderForMrt(viewMode, prev, perfDefaultColumnOrder);
        const nextRaw = typeof updater === 'function' ? (updater as (p: string[]) => string[])(base) : updater;
        const next =
          viewMode === 'table'
            ? ensureEncoreMrtSelectLeading(ensureEncoreMrtRowActionsInOrder(nextRaw))
            : ensureEncoreMrtRowActionsInOrder(nextRaw);
        const normalized = withEncoreMrtTrailingSpacer(normalizeEncoreMrtColumnOrder(next));
        persistPerformancesTablePrefs({ columnOrder: normalized });
        return normalized;
      });
    },
    [perfDefaultColumnOrder, persistPerformancesTablePrefs, viewMode],
  );
  const handlePerfSortingChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<PerfMrtRow>>[0]['onSortingChange']>>[0]) => {
      setPerfSorting((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
        persistPerformancesTablePrefs({ sorting: next });
        return next;
      });
    },
    [persistPerformancesTablePrefs],
  );
  const perfBodyRowProps = useMemo(() => ({ sx: perfTableBodyRowSx }), [perfTableBodyRowSx]);
  const perfInitialState = useMemo(() => ({ density: 'compact' as const }), []);

  const renderPerfRowActions = useCallback(
    ({ row }: { row: MRT_Row<PerfMrtRow> }) => (
      <IconButton size="small" aria-label="Edit performance" onClick={() => openEdit(row.original.perf)}>
        <EditIcon fontSize="small" />
      </IconButton>
    ),
    [openEdit],
  );

  const table = useMaterialReactTable<PerfMrtRow>({
    columns,
    data,
    getRowId: getPerfRowId,
    ...perfMrtBaseOptions,
    enableColumnFilters: false,
    enableHiding: true,
    enableColumnActions: false,
    enableColumnOrdering: true,
    displayColumnDefOptions: perfDisplayColumnDefOptions,
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderRowActions: renderPerfRowActions,
    enableRowSelection: viewMode === 'table',
    onRowSelectionChange: setRowSelection,
    state: perfMrtState,
    onColumnVisibilityChange: handlePerfColumnVisibilityChange,
    onColumnOrderChange: handlePerfColumnOrderChange,
    onSortingChange: handlePerfSortingChange,
    mrtTheme: perfMrtTheme,
    muiTableBodyRowProps: perfBodyRowProps,
    initialState: perfInitialState,
  });

  const performancesHeaderStackPb =
    performancesSubTab === 'list'
      ? { xs: 10, md: 5 }
      : performanceDashboardStats && extendedPerformanceInsights
        ? 0
        : { xs: 8, md: 6 };

  return (
    <>
      <Box
        sx={{
          px: encoreScreenPaddingX,
          pt: encorePagePaddingTop,
          pb: performancesHeaderStackPb,
          ...encoreMaxWidthPage,
        }}
      >
        <EncorePageHeader
          title={encorePossessivePageTitle(effectiveDisplayName, 'performances')}
          description="Every show you have logged. Open a song for charts, milestones, and notes."
          actions={
            <>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setPickSongOpen(true)}>
                Add performance
              </Button>
              <Button
                id="encore-performances-import-button"
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                endIcon={<ExpandMoreIcon sx={{ fontSize: 18, opacity: 0.85 }} />}
                aria-controls={importMenuAnchor ? 'encore-performances-import-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={importMenuAnchor ? 'true' : undefined}
                onClick={(e) => setImportMenuAnchor(e.currentTarget)}
                sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
              >
                Import
              </Button>
              <Menu
                id="encore-performances-import-menu"
                anchorEl={importMenuAnchor}
                open={Boolean(importMenuAnchor)}
                onClose={() => setImportMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  list: {
                    'aria-labelledby': 'encore-performances-import-button',
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
                  component="a"
                  href={encoreAppHref({ kind: 'help' })}
                  onClick={() => setImportMenuAnchor(null)}
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
                    setBulkPerfImportOpen(true);
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

        <Tabs
          value={performancesSubTab}
          aria-label="Performances sections"
          sx={{
            mt: 1,
            mb: 2.5,
            minHeight: 44,
            '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              letterSpacing: '-0.005em',
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary', fontWeight: 700 },
            },
          }}
        >
          <Tab
            label="Activity"
            value="list"
            component="a"
            href={encoreAppHref({ kind: 'performances', tab: 'list' })}
            id="encore-performances-subtab-list"
          />
          <Tab
            label="Insights"
            value="wrapped"
            component="a"
            href={encoreAppHref({ kind: 'performances', tab: 'wrapped' })}
            id="encore-performances-subtab-wrapped"
          />
        </Tabs>

        {performancesSubTab === 'list' ? (
          <>
            {performances.length > 0 && !hasAnyPerformanceVideoLink ? (
              <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
                  None of your performances have a linked video yet. Use <strong>Import</strong>,{' '}
                  <strong>Bulk import videos</strong>, above, or from Repertoire. Encore renames files in your
                  Performances folder to match the suggested pattern in{' '}
                  <Link href={encoreAppHref({ kind: 'help' })} sx={{ fontSize: 'inherit' }}>
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
          sx={{ maxWidth: { sm: 560 } }}
        />
      </EncoreToolbarRow>

      {performances.length > 0 ? (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Stack spacing={0.75}>
            <EncoreFilterChipBar
              ref={perfFilterBarRef}
              fields={perfFilterFieldDefs}
              visibleFieldIds={visiblePerfFilterIds}
              values={perfFilterValues}
              onChange={onPerfFilterChange}
              addableFields={perfAddableFilterFields}
              onVisibleFieldIdsChange={setVisiblePerfFilterIds}
              defaultPinnedFieldIds={[...PERFORMANCES_FILTER_PINNED]}
              hasActiveFilters={hasActivePerfFilters}
              onClearAll={() => {
                clearPerfFilters();
                setQuery('');
              }}
            />
            <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} useFlexGap>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, minWidth: 0 }}>
                Showing {data.length} of {performances.length}{' '}
                {performances.length === 1 ? 'performance' : 'performances'}
                {hasActivePerfFilters || query.trim() ? ' · search or filters applied' : ''}
              </Typography>
              <Stack direction="row" alignItems="center" gap={2.5} sx={{ flexShrink: 0 }}>
                <EncoreMrtColumnsSettingsButton
                  show={viewMode === 'table'}
                  table={table}
                  onResetLayout={resetPerformancesTableLayout}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={viewMode}
                  onChange={(_e, next: PerformancesViewMode | null) => {
                    if (next) setViewMode(next);
                  }}
                  aria-label="Performances layout"
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
              </Stack>
            </Stack>
          </Stack>
        </Box>
      ) : null}

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
          {/*
            Structured bulk-action bar mirroring LibraryScreen: edit affordances grouped on the
            left (Set venue, Set accompaniment), destructive Delete tucked into an overflow menu
            so it isn't a one-misclick action when many rows are selected.
          */}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedPerfIds.size} selected
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setBulkVenueOpen(true)}>
            Set venue…
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setBulkAccDraft([]);
              setBulkAccMode('replace');
              setBulkAccOpen(true);
            }}
          >
            Set accompaniment…
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="text" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
          <Tooltip title="More actions">
            <IconButton
              size="small"
              aria-label="More bulk actions"
              aria-haspopup="true"
              aria-expanded={bulkOverflowAnchor ? 'true' : undefined}
              onClick={(e) => setBulkOverflowAnchor(e.currentTarget)}
              sx={{
                ml: 0.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 0.5,
                color: 'text.secondary',
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={bulkOverflowAnchor}
            open={Boolean(bulkOverflowAnchor)}
            onClose={() => setBulkOverflowAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                setBulkOverflowAnchor(null);
                setBulkDeleteOpen(true);
              }}
              sx={{ color: 'error.main' }}
            >
              Delete…
            </MenuItem>
          </Menu>
        </Stack>
      ) : null}

      {performances.length === 0 && songs.length === 0 ? (
        <Stack spacing={1.5} sx={{ py: 4, maxWidth: 520 }}>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Nothing here yet. Add songs from Repertoire first, then log a performance from a song page or tap{' '}
            <strong>Add performance</strong> above.
          </Typography>
          <Button variant="outlined" size="small" component="a" href={encoreAppHref({ kind: 'library' })} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
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
            You have songs but no performances yet. Bulk import from Drive can attach many videos at once. Encore
            matches each file from the name and folder path, then renames files in your Performances folder to this
            pattern:
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
            to tag venue (and other metadata) for a whole folder. See Help.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" onClick={() => setBulkPerfImportOpen(true)} sx={{ textTransform: 'none' }}>
              Bulk import videos
            </Button>
            <Button variant="outlined" component="a" href={encoreAppHref({ kind: 'library' })} sx={{ textTransform: 'none' }}>
              Go to repertoire
            </Button>
            <Button variant="outlined" component="a" href={encoreAppHref({ kind: 'help' })} sx={{ textTransform: 'none' }}>
              Open import guide
            </Button>
          </Stack>
        </Paper>
      ) : viewMode === 'table' ? (
        <Box sx={{ mt: 2 }}>
          <PerformancesSearchHighlightContext.Provider value={debouncedQuery}>
            <MaterialReactTable table={table} />
          </PerformancesSearchHighlightContext.Provider>
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
                    component={song ? 'a' : 'span'}
                    href={song ? encoreAppHref({ kind: 'song', id: song.id }) : undefined}
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
                      textDecoration: 'none',
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
        </>
      ) : !performanceDashboardStats ? (
        <Stack spacing={2} sx={{ py: 6, maxWidth: 560 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Log a show to unlock insights
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            The Insights tab shows lifetime performance stats and lets you zoom into a single calendar year when you
            are ready.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}>
            <Button variant="contained" onClick={() => setPickSongOpen(true)} sx={{ textTransform: 'none' }}>
              Add performance
            </Button>
            <Button
              variant="outlined"
              component="a"
              href={encoreAppHref({ kind: 'performances', tab: 'list' })}
              sx={{ textTransform: 'none' }}
            >
              Back to activity
            </Button>
          </Stack>
        </Stack>
      ) : null}
      </Box>

      {performancesSubTab === 'wrapped' && performanceDashboardStats && extendedPerformanceInsights ? (
        <PerformancesWrappedScreen
          embedded
          performerDisplayName={effectiveDisplayName ?? ''}
          stats={performanceDashboardStats}
          extended={extendedPerformanceInsights}
          performances={performances}
          songById={songById}
          normalizeVenue={normalizePerfVenueLabel}
          onOpenSong={(id, e) => {
            if (e && isModifiedOrNonPrimaryClick(e)) {
              openEncoreRouteInBackgroundTab({ kind: 'song', id });
              return;
            }
            navigateEncore({ kind: 'song', id });
          }}
          onFocusYear={focusYearFilter}
          onFocusVenue={focusVenueFilter}
          onAddPerformance={() => setPickSongOpen(true)}
        />
      ) : null}

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
        open={bulkPerfImportOpen}
        onClose={() => setBulkPerfImportOpen(false)}
        songs={songs}
        googleAccessToken={googleAccessToken}
        spotifyLinked={spotifyLinked}
        onSaveSong={saveSong}
        onSavePerformances={async (rows) => {
          await bulkSavePerformances(rows);
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
          onSave={async (perf) => {
            await savePerformance(perf);
          }}
          onDelete={
            perfEditing
              ? async (id) => {
                  await deletePerformance(id);
                }
              : undefined
          }
        />
      )}

      <Dialog open={bulkVenueOpen} onClose={() => setBulkVenueOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>Set venue ({selectedPerfIds.size})</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          {/*
            Autocomplete (freeSolo) so users can pick a known venue (no typo risk and no
            duplicate "Martuni's" / "martunis") OR add a brand-new venue.
          */}
          <Autocomplete
            freeSolo
            autoSelect
            size="small"
            fullWidth
            options={venueOptions}
            value={bulkVenueDraft}
            onInputChange={(_, value) => setBulkVenueDraft(value)}
            onChange={(_, value) => setBulkVenueDraft(typeof value === 'string' ? value : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Venue"
                placeholder={venueOptions.length ? 'Pick an existing venue, or type a new one' : 'e.g. Martuni\u2019s'}
                helperText={venueOptions.length ? `${venueOptions.length} known venues` : undefined}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkVenueOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void applyBulkVenue()} disabled={!bulkVenueDraft.trim()}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkAccOpen} onClose={() => setBulkAccOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>Set accompaniment ({selectedPerfIds.size})</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Stack spacing={2}>
            <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
              {/*
                Render every accompaniment option as a toggle chip. Multi-select; the chosen set
                will either replace or be added to each performance's existing list (see
                `bulkAccMode` below).
              */}
              {ENCORE_ACCOMPANIMENT_TAGS.map((tag) => {
                const active = bulkAccDraft.includes(tag);
                return (
                  <Chip
                    key={tag}
                    size="small"
                    label={tag}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    clickable
                    onClick={() =>
                      setBulkAccDraft((prev) =>
                        prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
                      )
                    }
                  />
                );
              })}
            </Stack>
            <FormControl>
              <FormLabel
                id="encore-bulk-acc-mode"
                sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}
              >
                APPLY MODE
              </FormLabel>
              <RadioGroup
                row
                aria-labelledby="encore-bulk-acc-mode"
                value={bulkAccMode}
                onChange={(e) => setBulkAccMode(e.target.value === 'add' ? 'add' : 'replace')}
              >
                <FormControlLabel
                  value="replace"
                  control={<Radio size="small" />}
                  label="Replace existing"
                  componentsProps={{ typography: { variant: 'body2' } }}
                />
                <FormControlLabel
                  value="add"
                  control={<Radio size="small" />}
                  label="Add to existing"
                  componentsProps={{ typography: { variant: 'body2' } }}
                />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkAccOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void applyBulkAccompaniment()}
            // Replace with empty-set is allowed (clears accompaniment); 'add' with empty-set is a
            // no-op so disable Apply in that case.
            disabled={bulkAccMode === 'add' && bulkAccDraft.length === 0}
          >
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
    </>
  );
}
