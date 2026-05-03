/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SearchIcon from '@mui/icons-material/Search';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_RowSelectionState,
} from 'material-react-table';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import type { EncoreMrtTablePrefs, EncorePerformance, EncoreSong } from '../types';
import {
  encoreAppHref,
  isModifiedOrNonPrimaryClick,
  navigateEncore,
  openEncoreRouteInBackgroundTab,
} from '../routes/encoreAppHash';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { useEncore } from '../context/EncoreContext';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyTrack, spotifyTrackTitleAndArtist } from '../spotify/spotifyApi';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
  encoreMaxWidthPage,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreToolbarRow } from '../ui/EncoreToolbarRow';
import {
  EncoreFilterChipBar,
  type EncoreFilterChipBarHandle,
  type EncoreFilterFieldConfig,
} from '../ui/EncoreFilterChipBar';
import { EncoreMrtColumnHeader } from '../ui/EncoreMrtColumnHeader';
import { EncoreMrtColumnsSettingsButton } from '../ui/EncoreMrtColumnsSettingsButton';
import { AddSongDialog } from './AddSongDialog';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { PlaylistImportDialog } from './PlaylistImportDialog';
import { BulkPerformanceImportDialog } from './BulkPerformanceImportDialog';
import { BulkScoreImportDialog } from './BulkScoreImportDialog';
import { SongResourcesEditDialog, type SongResourcesEditSection } from './SongResourcesEditDialog';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import { milestoneProgressSummary } from '../repertoire/repertoireMilestoneSummary';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from '../repertoire/performanceKeys';
import { collectAllSongTags, normalizeSongTags } from '../repertoire/songTags';
import { effectiveSongAttachments } from '../utils/songAttachments';
import { InlineChipSelect } from '../ui/InlineEditChip';
import { InlineSongTagsCell } from '../ui/InlineSongTagsCell';
import { encoreMrtRepertoireTableOptions } from './encoreMrtTableDefaults';
import {
  ensureEncoreMrtRowActionsInOrder,
  ensureEncoreMrtSelectLeading,
  MRT_ROW_SELECT_COL,
  migrateEncoreMrtColumnOrderIds,
  migrateEncoreMrtColumnVisibility,
  normalizeEncoreMrtColumnOrder,
  withEncoreMrtTrailingSpacer,
} from './encoreMrtColumnOrder';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';
import { performanceVideoOpenUrl } from '../utils/performanceVideoUrl';
import { useDebouncedString } from '../utils/useDebouncedString';
import { ENCORE_FILTER_SENTINEL } from '../utils/encoreFilterSentinels';
import { HighlightedText } from '../ui/HighlightedText';
import AppTooltip from '../../shared/components/AppTooltip';

const REPERTOIRE_VIEW_STORAGE_KEY = 'encore.library.repertoireView';

type RepertoireViewMode = 'table' | 'grid';

const REPERTOIRE_FILTER_PINNED = ['performed', 'practicing', 'venue'] as const;

const REPERTOIRE_FILTER_EMPTY: Record<string, string[]> = {
  performed: [],
  practicing: [],
  venue: [],
  tags: [],
  artist: [],
  perfKey: [],
  assetRefs: [],
  assetBacking: [],
  assetSpotify: [],
  assetCharts: [],
  assetTakes: [],
  milestoneWhich: [],
  milestoneNotDone: [],
  milestoneDoneMin: [],
  milestoneDoneMax: [],
};

/** Columns that should be visible when missing from saved prefs (older installs). MRT uses `false` = hidden. */
const REP_COLUMN_VISIBLE_BY_DEFAULT_IF_ABSENT = {
  lastIso: true,
} as const satisfies Record<string, boolean>;

/** New resource columns: hidden until the user shows them (merged into prefs on load). MRT uses `false` = hidden. */
const REP_COLUMN_HIDDEN_BY_DEFAULT = {
  refTracks: false,
  backingTracks: false,
  spotifySource: false,
  songCharts: false,
  songTakes: false,
} as const satisfies Record<string, boolean>;

function mergeRepertoireColumnVisibility(
  saved: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const vis = { ...(saved ?? {}) };
  for (const [k, v] of Object.entries(REP_COLUMN_VISIBLE_BY_DEFAULT_IF_ABSENT)) {
    if (!(k in vis)) vis[k] = v;
  }
  for (const [k, v] of Object.entries(REP_COLUMN_HIDDEN_BY_DEFAULT)) {
    if (!(k in vis)) vis[k] = v;
  }
  return vis;
}

function countReferenceTracks(s: EncoreSong): number {
  return s.referenceLinks?.length ?? 0;
}

function countBackingTracks(s: EncoreSong): number {
  return s.backingLinks?.length ?? 0;
}

function countChartAttachments(s: EncoreSong): number {
  return effectiveSongAttachments(s).filter((a) => a.kind === 'chart').length;
}

function countTakeAttachments(s: EncoreSong): number {
  return effectiveSongAttachments(s).filter((a) => a.kind === 'recording').length;
}

function songHasSpotifySource(s: EncoreSong): boolean {
  return Boolean(s.spotifyTrackId?.trim());
}

function normalizeVenueTag(tag: string): string {
  return tag.trim() || 'Venue';
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '–';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function mrtColumnId<T extends Record<string, unknown>>(c: MRT_ColumnDef<T>): string {
  if (c.id) return c.id;
  if (typeof c.accessorKey === 'string') return c.accessorKey;
  if (c.accessorKey != null) return String(c.accessorKey);
  return '';
}

/** Match `state.columnOrder` so TanStack functional updaters see the same base as MRT. */
function repertoireColumnOrderForMrt(
  viewMode: RepertoireViewMode,
  repColOrder: string[] | undefined,
  repDefaultColumnOrder: string[],
): string[] {
  const base = repColOrder ?? repDefaultColumnOrder;
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

/** Show dense row actions on hover (fine pointer); keep visible on touch/coarse pointers. */
const REPERTOIRE_CELL_HOVER_ACTIONS_SX = {
  minWidth: 0,
  '@media (hover: hover) and (pointer: fine)': {
    '& .encore-rep-cell-hover-target': {
      opacity: 0,
      transition: 'opacity 120ms ease',
    },
    '&:hover .encore-rep-cell-hover-target, &:focus-within .encore-rep-cell-hover-target': {
      opacity: 1,
    },
  },
} as const;

type EncoreRepertoireMrtRow = {
  song: EncoreSong;
  title: string;
  artist: string;
  keyDisplay: string;
  perfCount: number;
  venues: string;
  /** Per-row venue list, sorted alphabetically. Drives the chip rendering in the Venues column. */
  venuesList: string[];
  lastIso: string;
  lastDisplay: string;
  /** Most recent performance for this song (perf list is sorted newest-first). */
  latestPerf: EncorePerformance | null;
  /** Number of template + song-only milestones in `done` state (for sorting). */
  milestoneDone: number;
  milestoneShort: string;
  milestoneDetail: string;
  tags: string[];
  tagsLabel: string;
  refCount: number;
  backingCount: number;
  hasSpotifySource: boolean;
  spotifySourceLabel: string;
  chartCount: number;
  takeCount: number;
};

const getRepertoireRowId = (row: EncoreRepertoireMrtRow): string => row.song.id;

const RepertoireTableMediaEdit = memo(function RepertoireTableMediaEdit(props: {
  song: EncoreSong;
  summary: ReactNode;
  tooltip: string;
  ariaLabel: string;
  section: SongResourcesEditSection;
  onEdit: (s: EncoreSong, section: SongResourcesEditSection) => void;
  /** Exclusive filter field (chip bar) + single value to apply when the filter control is used. */
  exclusiveFilter?: { fieldId: string; value: string };
  onApplyExclusiveFilter?: (fieldId: string, value: string) => void;
}) {
  const { song, summary, tooltip, ariaLabel, section, onEdit, exclusiveFilter, onApplyExclusiveFilter } = props;
  const showFilter = Boolean(exclusiveFilter && onApplyExclusiveFilter);
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
      <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>{summary}</Box>
      {showFilter ? (
        <Tooltip title="Filter to this value">
          <IconButton
            size="small"
            aria-label="Filter to this cell value"
            className="encore-rep-cell-hover-target"
            data-encore-row-control
            onClick={(e) => {
              e.stopPropagation();
              onApplyExclusiveFilter!(exclusiveFilter!.fieldId, exclusiveFilter!.value);
            }}
            sx={{ flexShrink: 0, p: 0.25 }}
          >
            <FilterListIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={ariaLabel}
          className="encore-rep-cell-hover-target"
          data-encore-row-control
          onClick={(e) => {
            e.stopPropagation();
            onEdit(song, section);
          }}
          sx={{ flexShrink: 0, p: 0.25 }}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
});

/**
 * Stable row sx applied to every repertoire row. Hoisted so the same object reference flows
 * to every row mount — emotion serializes it once and every row references the same generated
 * class. Inlining `{ cursor, '&:hover': ... }` would force a fresh emotion serialize per row.
 */
const REPERTOIRE_ROW_SX = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
} as const;

/** Repertoire grid cards list this many recent performances before offering "Show more". */
const REPERTOIRE_GRID_PERF_PREVIEW_COUNT = 5;

/**
 * Search predicate keyed off a precomputed `perfBySong` map (the screen already builds it for
 * the venue / "performed" filters). The legacy version filtered the global `performances` array
 * for every song on every keystroke — O(songs × performances). This O(songsPerformances) version
 * stays linear in the row's own performance list.
 */
function songMatchesSearch(
  song: EncoreSong,
  query: string,
  perfBySong: ReadonlyMap<string, ReadonlyArray<EncorePerformance>>,
): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  if (song.title.toLowerCase().includes(t) || song.artist.toLowerCase().includes(t)) return true;
  const songPerfs = perfBySong.get(song.id);
  if (songPerfs) {
    for (const p of songPerfs) {
      if (normalizeVenueTag(p.venueTag).toLowerCase().includes(t)) return true;
      if (p.date.toLowerCase().includes(t)) return true;
    }
  }
  if ((song.performanceKey ?? '').toLowerCase().includes(t)) return true;
  if (song.tags && song.tags.some((tag) => tag.toLowerCase().includes(t))) return true;
  return false;
}

function songMatchesAnySelectedTag(song: EncoreSong, selectedTags: string[]): boolean {
  if (!selectedTags.length) return true;
  const songTags = song.tags ?? [];
  const lower = (t: string) => t.trim().toLowerCase();
  const songLower = new Set(songTags.map((t) => lower(t)));
  return selectedTags.some((t) => songLower.has(lower(t)));
}

type RepertoireGridCardProps = {
  song: EncoreSong;
  perfs: EncorePerformance[];
  milestoneShort: string;
  milestoneTooltip: string;
  milestoneTotal: number;
  tagFilterOptions: string[];
  debouncedSearch: string;
  onOpenSong: (s: EncoreSong, e?: ReactMouseEvent) => void;
  onEditPerformance: (p: EncorePerformance, songId: string) => void;
  onLogPerformance: (song: EncoreSong) => void;
  onSongMenu: (el: HTMLElement, song: EncoreSong) => void;
  onTagsCommit: (song: EncoreSong, next: string[]) => void;
};

const RepertoireGridCard = memo(function RepertoireGridCard(props: RepertoireGridCardProps): React.ReactElement {
  const {
    song: s,
    perfs,
    milestoneShort,
    milestoneTooltip,
    milestoneTotal,
    tagFilterOptions,
    debouncedSearch,
    onOpenSong,
    onEditPerformance,
    onLogPerformance,
    onSongMenu,
    onTagsCommit,
  } = props;
  const theme = useTheme();
  const [perfExpanded, setPerfExpanded] = useState(false);
  const keyDisplay = s.performanceKey?.trim() || '';
  const perfOverflow = perfs.length > REPERTOIRE_GRID_PERF_PREVIEW_COUNT;
  const perfsToShow = perfExpanded || !perfOverflow ? perfs : perfs.slice(0, REPERTOIRE_GRID_PERF_PREVIEW_COUNT);
  const perfHiddenCount = perfOverflow ? perfs.length - REPERTOIRE_GRID_PERF_PREVIEW_COUNT : 0;
  return (
    <Card
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: encoreHairline,
        boxShadow: '0 1px 3px rgba(15, 15, 20, 0.04)',
        transition: (t) => t.transitions.create(['box-shadow', 'border-color'], { duration: 180 }),
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover': {
          borderColor: (t) => alpha(t.palette.divider, 0.55),
          boxShadow: '0 4px 16px rgba(15, 15, 20, 0.06)',
        },
      }}
    >
      <CardActionArea
        component="div"
        onClick={(e) => onOpenSong(s, e)}
        sx={{
          flex: 1,
          alignItems: 'stretch',
          cursor: 'pointer',
          borderRadius: 3,
          '&:hover': { bgcolor: 'transparent' },
          '&:hover .MuiCardActionArea-focusHighlight': {
            opacity: 0,
          },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            py: 2.25,
            px: 2.25,
            pb: 2,
            '&:last-child': { pb: 2 },
          }}
        >
          {s.albumArtUrl ? (
            <Box
              component="img"
              src={s.albumArtUrl}
              alt=""
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.5,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(15, 15, 20, 0.06)',
              }}
            />
          ) : (
            <Box
              sx={{
                ...encoreNoAlbumArtSurfaceSx(theme),
                width: 56,
                height: 56,
                borderRadius: 1.5,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 22 }} aria-hidden />
            </Box>
          )}
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0}>
            <Stack direction="row" alignItems="flex-start" gap={0.75} sx={{ minWidth: 0 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <AppTooltip title={s.title}>
                  <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
                    <HighlightedText
                      text={s.title}
                      highlight={debouncedSearch}
                      variant="subtitle1"
                      component="span"
                      sx={{
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.25,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'text.primary',
                      }}
                    />
                  </Box>
                </AppTooltip>
                <AppTooltip title={s.artist}>
                  <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
                    <HighlightedText
                      text={s.artist}
                      highlight={debouncedSearch}
                      variant="body2"
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mt: 0.35,
                        lineHeight: 1.45,
                        fontWeight: 400,
                      }}
                    />
                  </Box>
                </AppTooltip>
                {keyDisplay ? (
                  <Typography
                    variant="caption"
                    component="span"
                    display="block"
                    noWrap
                    sx={{
                      mt: 0.35,
                      fontWeight: 400,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'text.secondary',
                      opacity: 0.85,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {keyDisplay}
                  </Typography>
                ) : null}
              </Box>
              <IconButton
                size="small"
                aria-label={`More actions for ${s.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSongMenu(e.currentTarget, s);
                }}
                sx={{
                  flexShrink: 0,
                  mt: -0.5,
                  mr: -0.75,
                  color: 'text.secondary',
                  opacity: 0.55,
                  '&:hover': { opacity: 1, bgcolor: 'transparent' },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack sx={{ flex: 1, minWidth: 0, mt: 1.75 }} spacing={0}>
              <Stack spacing={1}>
                {s.practicing ? (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label="Currently practicing"
                    sx={{
                      height: 22,
                      fontWeight: 500,
                      alignSelf: 'flex-start',
                      borderColor: (t) => alpha(t.palette.primary.main, 0.22),
                      bgcolor: 'transparent',
                    }}
                  />
                ) : null}
                <InlineSongTagsCell
                  compact
                  sx={{ maxWidth: '100%' }}
                  tags={s.tags ?? []}
                  suggestions={tagFilterOptions}
                  onCommit={(next) => onTagsCommit(s, next)}
                />
              </Stack>

              {milestoneTotal > 0 ? (
                <Tooltip title={milestoneTooltip}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    noWrap
                    sx={{ mt: 1.25, fontWeight: 400, opacity: 0.9 }}
                  >
                    Milestones {milestoneShort}
                  </Typography>
                </Tooltip>
              ) : null}

              <Stack spacing={0.35} sx={{ mt: 1.25 }}>
                {perfsToShow.map((p) => {
                  const vid = performanceVideoOpenUrl(p);
                  const line = `${formatShortDate(p.date)} · ${normalizeVenueTag(p.venueTag)}`;
                  return (
                    <Stack key={p.id} direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0 }}>
                      {vid ? (
                        <Link
                          href={vid}
                          target="_blank"
                          rel="noreferrer"
                          variant="caption"
                          underline="hover"
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            color: 'text.secondary',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 400,
                            opacity: 0.92,
                          }}
                        >
                          {line}
                          <OpenInNewIcon sx={{ fontSize: 11, ml: 0.25, verticalAlign: 'middle', opacity: 0.55 }} />
                        </Link>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ flex: 1, minWidth: 0, fontWeight: 400, opacity: 0.92 }}
                        >
                          {line}
                        </Typography>
                      )}
                      <IconButton
                        size="small"
                        aria-label={`Edit performance ${line}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPerformance(p, s.id);
                        }}
                        sx={{ p: 0.2, flexShrink: 0, color: 'text.secondary', opacity: 0.45, '&:hover': { opacity: 0.85 } }}
                      >
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  );
                })}
                {perfOverflow && !perfExpanded ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPerfExpanded(true);
                    }}
                    aria-label={`Show ${perfHiddenCount} more performances for ${s.title}`}
                    sx={{
                      alignSelf: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 400,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      px: 0,
                      minHeight: 0,
                      py: 0.25,
                      opacity: 0.85,
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline', opacity: 1 },
                    }}
                  >
                    Show more ({perfHiddenCount})
                  </Button>
                ) : null}
                {perfOverflow && perfExpanded ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPerfExpanded(false);
                    }}
                    aria-label={`Show fewer performances for ${s.title}`}
                    sx={{
                      alignSelf: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 400,
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      px: 0,
                      minHeight: 0,
                      py: 0.25,
                      opacity: 0.85,
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline', opacity: 1 },
                    }}
                  >
                    Show less
                  </Button>
                ) : null}
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0, pt: 0.15 }}>
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogPerformance(s);
                    }}
                    aria-label={`Log performance for ${s.title}`}
                    startIcon={<AddIcon sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.65 }} />}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      justifyContent: 'flex-start',
                      py: 0,
                      px: 0,
                      textTransform: 'none',
                      fontWeight: 400,
                      fontSize: '0.75rem',
                      lineHeight: 1.35,
                      color: 'text.secondary',
                      opacity: 0.9,
                      '&:hover': { bgcolor: 'transparent', opacity: 1 },
                      '& .MuiButton-startIcon': { mr: 0.35, ml: 0 },
                    }}
                  >
                    Log performance
                  </Button>
                  <Box sx={{ width: 24, height: 24, flexShrink: 0 }} aria-hidden />
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
});

export function LibraryScreen(): React.ReactElement {
  const theme = useTheme();
  const {
    songs,
    performances,
    repertoireExtras,
    saveRepertoireExtras,
    saveSong,
    deleteSong,
    bulkSaveSongs,
    bulkDeleteSongs,
    bulkSavePerformances,
    savePerformance,
    deletePerformance,
    googleAccessToken,
    spotifyLinked,
    connectSpotify,
    effectiveDisplayName,
  } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const spotifyClientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const [importOpen, setImportOpen] = useState(false);
  const [importPlacement, setImportPlacement] = useState<'reference' | 'backing'>('reference');
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [bulkPerfOpen, setBulkPerfOpen] = useState(false);
  const [bulkScoreOpen, setBulkScoreOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(null);
  const [perfSongId, setPerfSongId] = useState<string | null>(null);
  const [perfBrowse, setPerfBrowse] = useState<null | { song: EncoreSong; perfs: EncorePerformance[] }>(null);
  const [songResourcesTarget, setSongResourcesTarget] = useState<EncoreSong | null>(null);
  const [songResourcesSection, setSongResourcesSection] = useState<SongResourcesEditSection>('all');
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; song: EncoreSong }>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedString(searchQuery, 220);
  const [repertoireFilterValues, setRepertoireFilterValues] = useState<Record<string, string[]>>(
    () => ({ ...REPERTOIRE_FILTER_EMPTY }),
  );
  const [visibleRepertoireFilterIds, setVisibleRepertoireFilterIds] = useState<string[]>([
    ...REPERTOIRE_FILTER_PINNED,
  ]);
  const [viewMode, setViewMode] = useState<RepertoireViewMode>(() => {
    if (typeof window === 'undefined') return 'table';
    return window.localStorage.getItem(REPERTOIRE_VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'table';
  });
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRefreshSpotifyOpen, setBulkRefreshSpotifyOpen] = useState(false);
  const [bulkSpotifyRefreshToast, setBulkSpotifyRefreshToast] = useState<null | { message: string; severity: 'success' | 'error' }>(null);
  const [bulkOverflowAnchor, setBulkOverflowAnchor] = useState<HTMLElement | null>(null);

  const extrasRef = useRef(repertoireExtras);
  extrasRef.current = repertoireExtras;

  const [repColVis, setRepColVis] = useState<Record<string, boolean>>({});
  const [repColOrder, setRepColOrder] = useState<string[] | undefined>(undefined);
  const [repSorting, setRepSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'title', desc: false },
  ]);

  const repertoireFilterBarRef = useRef<EncoreFilterChipBarHandle>(null);

  // Hydrate from synced table prefs only when the synced object identity changes (Dexie put gives
  // us a fresh row on each save). We compare the four sub-fields shallowly so re-rendering does
  // not stringify the whole prefs object on every commit.
  const lastAppliedRepTableRef = useRef<EncoreMrtTablePrefs | null>(null);
  useEffect(() => {
    const r = repertoireExtras.tableUi?.repertoire;
    if (!r) return;
    if (lastAppliedRepTableRef.current === r) return;
    lastAppliedRepTableRef.current = r;
    setRepColVis(mergeRepertoireColumnVisibility(migrateEncoreMrtColumnVisibility(r.columnVisibility ?? {})));
    setRepColOrder(
      r.columnOrder?.length
        ? withEncoreMrtTrailingSpacer(normalizeEncoreMrtColumnOrder(migrateEncoreMrtColumnOrderIds(r.columnOrder)))
        : undefined,
    );
    setRepSorting(r.sorting?.length ? r.sorting : [{ id: 'title', desc: false }]);
  }, [repertoireExtras.tableUi]);

  const persistRepertoireTablePrefs = useCallback(
    (patch: Partial<EncoreMrtTablePrefs>) => {
      const cur = extrasRef.current.tableUi ?? {};
      const nextRep: EncoreMrtTablePrefs = { ...(cur.repertoire ?? {}), ...patch };
      void saveRepertoireExtras({ tableUi: { ...cur, repertoire: nextRep } });
    },
    [saveRepertoireExtras],
  );

  const resetRepertoireTableLayout = useCallback(() => {
    lastAppliedRepTableRef.current = null;
    const nextVis = mergeRepertoireColumnVisibility({});
    setRepColVis(nextVis);
    setRepColOrder(undefined);
    const defSort = [{ id: 'title', desc: false }];
    setRepSorting(defSort);
    persistRepertoireTablePrefs({
      columnVisibility: nextVis,
      columnOrder: undefined,
      sorting: defSort,
    });
  }, [persistRepertoireTablePrefs]);

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

  const artistFilterOptions = useMemo(() => {
    const s = new Set<string>();
    for (const song of songs) {
      const a = song.artist.trim();
      if (a) s.add(a);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [songs]);

  const keyFilterOptions = useMemo(() => {
    const s = new Set<string>(ENCORE_PERFORMANCE_KEY_OPTIONS);
    for (const song of songs) {
      const k = song.performanceKey?.trim();
      if (k) s.add(k);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [songs]);

  const milestoneWhichFieldOptions = useMemo(
    () =>
      [...repertoireExtras.milestoneTemplate]
        .filter((m) => !m.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        .map((m) => ({ value: m.id, label: m.label })),
    [repertoireExtras.milestoneTemplate],
  );

  const milestoneCountFilterOptions = useMemo(() => {
    const tmpl = repertoireExtras.milestoneTemplate.filter((m) => !m.archived).length;
    const songOnlyMax = songs.reduce((m, s) => Math.max(m, (s.songOnlyMilestones ?? []).length), 0);
    const cap = Math.min(48, Math.max(1, tmpl + songOnlyMax));
    return Array.from({ length: cap + 1 }, (_, i) => ({ value: String(i), label: String(i) }));
  }, [repertoireExtras.milestoneTemplate, songs]);

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

  const perfPresence = repertoireFilterValues.performed[0] === 'with' ? 'with' : repertoireFilterValues.performed[0] === 'none' ? 'none' : 'all';
  const practicingSel = repertoireFilterValues.practicing[0];
  const practicingFilter =
    practicingSel === 'practicing'
      ? 'practicing'
      : practicingSel === 'not_practicing'
        ? 'not_practicing'
        : 'all';

  const repertoireSongs = useMemo(() => {
    const venueFilters = repertoireFilterValues.venue ?? [];
    const tagFilters = repertoireFilterValues.tags ?? [];
    const artistFilters = repertoireFilterValues.artist ?? [];
    const keyFilters = repertoireFilterValues.perfKey ?? [];
    const milestoneWhich = repertoireFilterValues.milestoneWhich ?? [];
    const milestoneNotDone = repertoireFilterValues.milestoneNotDone ?? [];
    const milestoneMinRaw = repertoireFilterValues.milestoneDoneMin?.[0];
    const milestoneMaxRaw = repertoireFilterValues.milestoneDoneMax?.[0];
    const milestoneMin = milestoneMinRaw != null && milestoneMinRaw !== '' ? Number(milestoneMinRaw) : null;
    const milestoneMax = milestoneMaxRaw != null && milestoneMaxRaw !== '' ? Number(milestoneMaxRaw) : null;
    const assetRefs = repertoireFilterValues.assetRefs?.[0];
    const assetBacking = repertoireFilterValues.assetBacking?.[0];
    const assetSpotify = repertoireFilterValues.assetSpotify?.[0];
    const assetCharts = repertoireFilterValues.assetCharts?.[0];
    const assetTakes = repertoireFilterValues.assetTakes?.[0];
    const template = repertoireExtras.milestoneTemplate;

    let list = songs;
    if (perfPresence === 'with') {
      list = list.filter((s) => (perfBySong.get(s.id) ?? []).length > 0);
    } else if (perfPresence === 'none') {
      list = list.filter((s) => (perfBySong.get(s.id) ?? []).length === 0);
    }
    if (venueFilters.length > 0) {
      const blankVenue = venueFilters.includes(ENCORE_FILTER_SENTINEL.repertoireNoPerformances);
      const concreteVenues = venueFilters.filter((v) => v !== ENCORE_FILTER_SENTINEL.repertoireNoPerformances);
      list = list.filter((s) => {
        const songPerfs = perfBySong.get(s.id) ?? [];
        const noPerf = songPerfs.length === 0;
        const matchBlank = blankVenue && noPerf;
        const matchConcrete =
          concreteVenues.length > 0 &&
          concreteVenues.some((v) =>
            performances.some((p) => p.songId === s.id && normalizeVenueTag(p.venueTag) === v),
          );
        if (blankVenue && concreteVenues.length === 0) return noPerf;
        if (blankVenue && concreteVenues.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (practicingFilter === 'practicing') {
      list = list.filter((s) => Boolean(s.practicing));
    } else if (practicingFilter === 'not_practicing') {
      list = list.filter((s) => !s.practicing);
    }
    if (tagFilters.length > 0) {
      const blankTags = tagFilters.includes(ENCORE_FILTER_SENTINEL.blankTags);
      const concreteTags = tagFilters.filter((t) => t !== ENCORE_FILTER_SENTINEL.blankTags);
      list = list.filter((s) => {
        const songTags = s.tags ?? [];
        const isUntagged = songTags.length === 0;
        const matchBlank = blankTags && isUntagged;
        const matchConcrete =
          concreteTags.length > 0 && songMatchesAnySelectedTag(s, concreteTags);
        if (blankTags && concreteTags.length === 0) return isUntagged;
        if (blankTags && concreteTags.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (artistFilters.length > 0) {
      const blankArtist = artistFilters.includes(ENCORE_FILTER_SENTINEL.blankArtist);
      const concreteArtists = artistFilters.filter((a) => a !== ENCORE_FILTER_SENTINEL.blankArtist);
      list = list.filter((s) => {
        const a = s.artist.trim();
        const isBlank = !a;
        const matchBlank = blankArtist && isBlank;
        const matchConcrete =
          concreteArtists.length > 0 &&
          concreteArtists.some((x) => a.toLowerCase() === x.trim().toLowerCase());
        if (blankArtist && concreteArtists.length === 0) return isBlank;
        if (blankArtist && concreteArtists.length > 0) return matchBlank || matchConcrete;
        return matchConcrete;
      });
    }
    if (keyFilters.length > 0) {
      list = list.filter((s) => {
        const k = (s.performanceKey ?? '').trim();
        return keyFilters.some((sel) =>
          sel === ENCORE_FILTER_SENTINEL.blankKey ? !k : k === sel,
        );
      });
    }
    if (assetRefs === 'with') list = list.filter((s) => countReferenceTracks(s) > 0);
    else if (assetRefs === 'without') list = list.filter((s) => countReferenceTracks(s) === 0);
    if (assetBacking === 'with') list = list.filter((s) => countBackingTracks(s) > 0);
    else if (assetBacking === 'without') list = list.filter((s) => countBackingTracks(s) === 0);
    if (assetSpotify === 'with') list = list.filter((s) => songHasSpotifySource(s));
    else if (assetSpotify === 'without') list = list.filter((s) => !songHasSpotifySource(s));
    if (assetCharts === 'with') list = list.filter((s) => countChartAttachments(s) > 0);
    else if (assetCharts === 'without') list = list.filter((s) => countChartAttachments(s) === 0);
    if (assetTakes === 'with') list = list.filter((s) => countTakeAttachments(s) > 0);
    else if (assetTakes === 'without') list = list.filter((s) => countTakeAttachments(s) === 0);

    if (milestoneWhich.length > 0) {
      list = list.filter((s) => {
        const synced = applyTemplateProgressToSong(s, template);
        return milestoneWhich.every((id) => synced.milestoneProgress?.[id]?.state === 'done');
      });
    }
    if (milestoneNotDone.length > 0) {
      list = list.filter((s) => {
        const synced = applyTemplateProgressToSong(s, template);
        return milestoneNotDone.every((id) => synced.milestoneProgress?.[id]?.state !== 'done');
      });
    }
    if (milestoneMin != null && !Number.isNaN(milestoneMin)) {
      list = list.filter((s) => milestoneProgressSummary(s, template).done >= milestoneMin);
    }
    if (milestoneMax != null && !Number.isNaN(milestoneMax)) {
      list = list.filter((s) => milestoneProgressSummary(s, template).done <= milestoneMax);
    }

    if (debouncedSearch.trim()) {
      list = list.filter((s) => songMatchesSearch(s, debouncedSearch, perfBySong));
    }
    return list;
  }, [
    songs,
    perfPresence,
    practicingFilter,
    repertoireFilterValues,
    debouncedSearch,
    performances,
    perfBySong,
    repertoireExtras.milestoneTemplate,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      perfPresence !== 'all' ||
      practicingFilter !== 'all' ||
      (repertoireFilterValues.venue ?? []).length > 0 ||
      (repertoireFilterValues.tags ?? []).length > 0 ||
      (repertoireFilterValues.artist ?? []).length > 0 ||
      (repertoireFilterValues.perfKey ?? []).length > 0 ||
      (repertoireFilterValues.assetRefs ?? []).length > 0 ||
      (repertoireFilterValues.assetBacking ?? []).length > 0 ||
      (repertoireFilterValues.assetSpotify ?? []).length > 0 ||
      (repertoireFilterValues.assetCharts ?? []).length > 0 ||
      (repertoireFilterValues.assetTakes ?? []).length > 0 ||
      (repertoireFilterValues.milestoneWhich ?? []).length > 0 ||
      (repertoireFilterValues.milestoneNotDone ?? []).length > 0 ||
      (repertoireFilterValues.milestoneDoneMin ?? []).length > 0 ||
      (repertoireFilterValues.milestoneDoneMax ?? []).length > 0,
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setRepertoireFilterValues({ ...REPERTOIRE_FILTER_EMPTY });
    setVisibleRepertoireFilterIds([...REPERTOIRE_FILTER_PINNED]);
  }, []);

  const repertoireFilterFieldDefs = useMemo((): EncoreFilterFieldConfig[] => {
    const venueOpts = [
      { value: ENCORE_FILTER_SENTINEL.repertoireNoPerformances, label: 'No performances yet' },
      ...[...venueOptions]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((v) => ({ value: v, label: v })),
    ];
    const tagOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankTags, label: 'No tags' },
      ...collectAllSongTags(songs).map((t) => ({ value: t, label: t })),
    ];
    const artistOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankArtist, label: 'No artist' },
      ...artistFilterOptions.map((a) => ({ value: a, label: a })),
    ];
    const keyOpts = [
      { value: ENCORE_FILTER_SENTINEL.blankKey, label: 'No key set' },
      ...keyFilterOptions.map((k) => ({ value: k, label: k })),
    ];
    const assetPair: EncoreFilterFieldConfig[] = [
      {
        id: 'assetRefs',
        label: 'References',
        exclusive: true,
        options: [
          { value: 'with', label: 'Has reference tracks' },
          { value: 'without', label: 'No reference tracks' },
        ],
      },
      {
        id: 'assetBacking',
        label: 'Backing tracks',
        exclusive: true,
        options: [
          { value: 'with', label: 'Has backing tracks' },
          { value: 'without', label: 'No backing tracks' },
        ],
      },
      {
        id: 'assetSpotify',
        label: 'Spotify source',
        exclusive: true,
        options: [
          { value: 'with', label: 'Spotify info source set' },
          { value: 'without', label: 'No Spotify source' },
        ],
      },
      {
        id: 'assetCharts',
        label: 'Charts',
        exclusive: true,
        options: [
          { value: 'with', label: 'Has charts' },
          { value: 'without', label: 'No charts' },
        ],
      },
      {
        id: 'assetTakes',
        label: 'Takes',
        exclusive: true,
        options: [
          { value: 'with', label: 'Has takes' },
          { value: 'without', label: 'No takes' },
        ],
      },
    ];
    const milestoneFields: EncoreFilterFieldConfig[] = [];
    if (milestoneWhichFieldOptions.length > 0) {
      milestoneFields.push({
        id: 'milestoneWhich',
        label: 'Milestone checked off',
        allowEmptyOptions: true,
        options: milestoneWhichFieldOptions,
      });
      milestoneFields.push({
        id: 'milestoneNotDone',
        label: 'Milestone not complete',
        allowEmptyOptions: true,
        options: milestoneWhichFieldOptions,
      });
    }
    milestoneFields.push(
      {
        id: 'milestoneDoneMin',
        label: 'Done count (min)',
        exclusive: true,
        options: milestoneCountFilterOptions,
      },
      {
        id: 'milestoneDoneMax',
        label: 'Done count (max)',
        exclusive: true,
        options: milestoneCountFilterOptions,
      },
    );

    return [
      {
        id: 'performed',
        label: 'Performed',
        exclusive: true,
        options: [
          { value: 'with', label: 'With performances' },
          { value: 'none', label: 'None yet' },
        ],
      },
      {
        id: 'practicing',
        label: 'Status',
        exclusive: true,
        options: [
          { value: 'practicing', label: 'Currently practicing' },
          { value: 'not_practicing', label: 'Not practicing' },
        ],
      },
      { id: 'venue', label: 'Venue', options: venueOpts },
      { id: 'tags', label: 'Tags', options: tagOpts },
      { id: 'artist', label: 'Artist', options: artistOpts },
      { id: 'perfKey', label: 'Key', options: keyOpts },
      ...assetPair,
      ...milestoneFields,
    ];
  }, [
    songs,
    venueOptions,
    artistFilterOptions,
    keyFilterOptions,
    milestoneWhichFieldOptions,
    milestoneCountFilterOptions,
  ]);

  const repertoireAddableFilterFields = useMemo(() => {
    const pinned = new Set<string>(REPERTOIRE_FILTER_PINNED);
    return repertoireFilterFieldDefs.filter((f) => !pinned.has(f.id));
  }, [repertoireFilterFieldDefs]);

  const onRepertoireFilterChange = useCallback((fieldId: string, nextValues: string[]) => {
    setRepertoireFilterValues((prev) => ({ ...prev, [fieldId]: nextValues }));
  }, []);

  const applyExclusiveRepertoireFilter = useCallback((fieldId: string, value: string) => {
    setVisibleRepertoireFilterIds((prev) => (prev.includes(fieldId) ? prev : [...prev, fieldId]));
    setRepertoireFilterValues((prev) => ({ ...prev, [fieldId]: [value] }));
  }, []);

  const tableData = useMemo((): EncoreRepertoireMrtRow[] => {
    return repertoireSongs.map((s) => {
      const perfList = perfBySong.get(s.id) ?? [];
      const perfCount = perfList.length;
      const venueSet = new Set(perfList.map((p) => normalizeVenueTag(p.venueTag)));
      const venuesList = [...venueSet].sort((a, b) => a.localeCompare(b));
      const venues = venuesList.join(', ') || '–';
      const last =
        perfList.length === 0 ? null : perfList.reduce((best, p) => (p.date >= best.date ? p : best), perfList[0]!).date;
      const latestPerf = perfList.length === 0 ? null : perfList[0];
      const keyDisplay = s.performanceKey?.trim() || '–';
      const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
      const tags = s.tags ?? [];
      const spotId = s.spotifyTrackId?.trim() ?? '';
      const spotifySourceLabel = spotId
        ? spotId.length > 10
          ? `${spotId.slice(0, 8)}…`
          : spotId
        : '–';
      return {
        song: s,
        title: s.title,
        artist: s.artist,
        keyDisplay,
        perfCount,
        venues,
        venuesList,
        lastIso: last ?? '',
        lastDisplay: formatShortDate(last),
        latestPerf,
        milestoneDone: ms.done,
        milestoneShort: ms.labelShort,
        milestoneDetail: ms.tooltip,
        tags,
        tagsLabel: tags.join(', '),
        refCount: countReferenceTracks(s),
        backingCount: countBackingTracks(s),
        hasSpotifySource: songHasSpotifySource(s),
        spotifySourceLabel,
        chartCount: countChartAttachments(s),
        takeCount: countTakeAttachments(s),
      };
    });
  }, [repertoireSongs, perfBySong, repertoireExtras.milestoneTemplate]);

  const tagFilterOptions = useMemo(() => collectAllSongTags(songs), [songs]);

  const openSong = useCallback((s: EncoreSong, e?: ReactMouseEvent | globalThis.MouseEvent | null) => {
    if (e && isModifiedOrNonPrimaryClick(e)) {
      openEncoreRouteInBackgroundTab({ kind: 'song', id: s.id });
      return;
    }
    navigateEncore({ kind: 'song', id: s.id });
  }, []);

  const openSongResources = useCallback((s: EncoreSong, section: SongResourcesEditSection) => {
    setSongResourcesTarget(s);
    setSongResourcesSection(section);
  }, []);

  const onGridEditPerformance = useCallback((p: EncorePerformance, songId: string) => {
    setPerfEditing(p);
    setPerfSongId(songId);
    setPerfOpen(true);
  }, []);

  const onGridLogPerformance = useCallback((song: EncoreSong) => {
    setPerfSongId(song.id);
    setPerfEditing(null);
    setPerfOpen(true);
  }, []);

  const onGridSongMenu = useCallback((el: HTMLElement, song: EncoreSong) => {
    setMenuAnchor({ el, song });
  }, []);

  const onGridTagsCommit = useCallback(
    (song: EncoreSong, next: string[]) => {
      void saveSong({
        ...song,
        tags: next.length ? next : undefined,
        updatedAt: new Date().toISOString(),
      });
    },
    [saveSong],
  );

  const selectedSongIds = useMemo(
    () => new Set(Object.keys(rowSelection).filter((id) => rowSelection[id])),
    [rowSelection],
  );

  const bulkSetPracticing = useCallback(
    async (practicing: boolean) => {
      const now = new Date().toISOString();
      const updates = tableData
        .filter((row) => selectedSongIds.has(row.song.id))
        .map((row) => ({ ...row.song, practicing, updatedAt: now }));
      await bulkSaveSongs(updates);
      setRowSelection({});
    },
    [tableData, selectedSongIds, bulkSaveSongs],
  );

  const bulkAddTag = useCallback(async () => {
    const tag = bulkTagInput.trim();
    if (!tag) return;
    const now = new Date().toISOString();
    const updates = tableData
      .filter((row) => selectedSongIds.has(row.song.id))
      .map((row) => {
        const next = normalizeSongTags([...(row.song.tags ?? []), tag]);
        return { ...row.song, tags: next.length ? next : undefined, updatedAt: now };
      });
    await bulkSaveSongs(updates);
    setBulkTagInput('');
    setBulkTagOpen(false);
    setRowSelection({});
  }, [bulkTagInput, tableData, selectedSongIds, bulkSaveSongs]);

  const bulkRemoveSongs = useCallback(async () => {
    await bulkDeleteSongs([...selectedSongIds]);
    setBulkDeleteOpen(false);
    setRowSelection({});
  }, [bulkDeleteSongs, selectedSongIds]);

  const bulkSpotifyRefreshPlan = useMemo(() => {
    const rows = tableData.filter((row) => selectedSongIds.has(row.song.id));
    const eligibleCount = rows.filter((r) => Boolean(r.song.spotifyTrackId?.trim())).length;
    return {
      total: rows.length,
      eligibleCount,
      skippedNoSource: rows.length - eligibleCount,
    };
  }, [tableData, selectedSongIds]);

  const runBulkRefreshSpotifyMetadata = useCallback(async () => {
    const eligible = tableData
      .filter((row) => selectedSongIds.has(row.song.id))
      .map((r) => r.song)
      .filter((s) => Boolean(s.spotifyTrackId?.trim()));
    if (!spotifyClientId || eligible.length === 0) {
      setBulkRefreshSpotifyOpen(false);
      return;
    }
    setBulkRefreshSpotifyOpen(false);
    try {
      const message = await withBlockingJob('Refreshing song info from Spotify…', async (setProgress) => {
        const token = await ensureSpotifyAccessToken(spotifyClientId);
        if (!token) {
          throw new Error('Connect Spotify from the Account menu, then try again.');
        }
        const toSave: EncoreSong[] = [];
        let unchanged = 0;
        let errors = 0;
        const n = eligible.length;
        for (let i = 0; i < n; i++) {
          const song = eligible[i]!;
          const trackId = song.spotifyTrackId!.trim();
          setProgress(n <= 1 ? null : (i + 1) / n);
          try {
            const track = await fetchSpotifyTrack(token, trackId);
            const { title, artist } = spotifyTrackTitleAndArtist(track);
            if (title === song.title.trim() && artist === song.artist.trim()) {
              unchanged += 1;
            } else {
              toSave.push({
                ...song,
                title,
                artist,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {
            errors += 1;
          }
        }
        setProgress(1);
        if (toSave.length > 0) {
          await bulkSaveSongs(toSave);
        }
        const parts: string[] = [];
        if (toSave.length > 0) parts.push(`Updated ${toSave.length} song${toSave.length === 1 ? '' : 's'}`);
        if (unchanged > 0) parts.push(`${unchanged} already matched Spotify`);
        if (errors > 0) parts.push(`${errors} could not be fetched`);
        return parts.join(' · ') || 'No changes.';
      });
      setBulkSpotifyRefreshToast({ message, severity: 'success' });
    } catch (e) {
      setBulkSpotifyRefreshToast({
        message: e instanceof Error ? e.message : String(e),
        severity: 'error',
      });
    }
  }, [tableData, selectedSongIds, spotifyClientId, withBlockingJob, bulkSaveSongs]);

  const columns = useMemo<MRT_ColumnDef<EncoreRepertoireMrtRow>[]>(
    () => [
      {
        id: 'art',
        header: '',
        size: 56,
        minSize: 52,
        maxSize: 72,
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
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Title" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 220,
        minSize: 200,
        Cell: ({ renderedCellValue }) => {
          const t = String(renderedCellValue ?? '');
          return (
            <AppTooltip title={t}>
              <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
                <HighlightedText
                  text={t}
                  highlight={debouncedSearch}
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: 'text.primary',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                />
              </Box>
            </AppTooltip>
          );
        },
      },
      {
        accessorKey: 'artist',
        header: 'Artist',
        meta: { encoreFilterFieldId: 'artist' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Artist" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 180,
        minSize: 140,
        Cell: ({ row }) => {
          const s = row.original.song;
          const t = String(s.artist ?? '');
          const filterVal = t.trim() ? t.trim() : ENCORE_FILTER_SENTINEL.blankArtist;
          return (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
              <Box sx={{ minWidth: 0, flex: 1, maxWidth: '100%' }}>
                <AppTooltip title={t}>
                  <Box component="span" sx={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
                    <HighlightedText
                      text={t}
                      highlight={debouncedSearch}
                      variant="body2"
                      sx={{
                        lineHeight: 1.35,
                        color: 'text.secondary',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    />
                  </Box>
                </AppTooltip>
              </Box>
              <Tooltip title="Filter to this artist">
                <IconButton
                  size="small"
                  aria-label="Filter to this artist"
                  className="encore-rep-cell-hover-target"
                  data-encore-row-control
                  onClick={(e) => {
                    e.stopPropagation();
                    applyExclusiveRepertoireFilter('artist', filterVal);
                  }}
                  sx={{ flexShrink: 0, p: 0.25 }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        accessorKey: 'tagsLabel',
        header: 'Tags',
        meta: { encoreFilterFieldId: 'tags' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Tags" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 200,
        minSize: 168,
        enableSorting: false,
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
        meta: { encoreFilterFieldId: 'perfKey' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Key" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 132,
        minSize: 100,
        Cell: ({ row }) => {
          const song = row.original.song;
          const kRaw = (song.performanceKey ?? '').trim();
          const filterVal = kRaw ? kRaw : ENCORE_FILTER_SENTINEL.blankKey;
          return (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
              <Box sx={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
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
              </Box>
              <Tooltip title="Filter to this key">
                <IconButton
                  size="small"
                  aria-label="Filter to this key"
                  className="encore-rep-cell-hover-target"
                  data-encore-row-control
                  onClick={(e) => {
                    e.stopPropagation();
                    applyExclusiveRepertoireFilter('perfKey', filterVal);
                  }}
                  sx={{ flexShrink: 0, p: 0.25 }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        accessorKey: 'perfCount',
        header: 'Performances',
        meta: { encoreFilterFieldId: 'performed' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Performances" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 132,
        minSize: 124,
        Cell: ({ row }) => {
          const n = row.original.perfCount;
          const filterVal = n > 0 ? 'with' : 'none';
          const summary =
            n > 0 ? (
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
              >
                {n}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                –
              </Typography>
            );
          return (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
              <Box sx={{ minWidth: 0, flex: 1 }}>{summary}</Box>
              <Tooltip title="Filter by performance status for this row">
                <IconButton
                  size="small"
                  aria-label="Filter by performances"
                  className="encore-rep-cell-hover-target"
                  data-encore-row-control
                  onClick={(e) => {
                    e.stopPropagation();
                    applyExclusiveRepertoireFilter('performed', filterVal);
                  }}
                  sx={{ flexShrink: 0, p: 0.25 }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        id: 'practicing',
        header: 'Practicing',
        meta: { encoreFilterFieldId: 'practicing' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader
            label="Practicing"
            tooltipTitle="Currently practicing"
            column={column}
            filterBarRef={repertoireFilterBarRef}
          />
        ),
        size: 112,
        minSize: 108,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const filterVal = s.practicing ? 'practicing' : 'not_practicing';
          return (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
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
              <Tooltip title="Filter to this practicing status">
                <IconButton
                  size="small"
                  aria-label="Filter by practicing status"
                  className="encore-rep-cell-hover-target"
                  data-encore-row-control
                  onClick={(e) => {
                    e.stopPropagation();
                    applyExclusiveRepertoireFilter('practicing', filterVal);
                  }}
                  sx={{ flexShrink: 0, p: 0.25 }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        id: 'milestones',
        accessorKey: 'milestoneDone',
        header: 'Milestones',
        Header: ({ column }) => (
          <EncoreMrtColumnHeader
            label="Milestones"
            column={column}
            filterBarRef={repertoireFilterBarRef}
            filterFieldId={milestoneWhichFieldOptions.length > 0 ? 'milestoneWhich' : 'milestoneDoneMin'}
          />
        ),
        sortingFn: 'basic',
        size: 112,
        minSize: 104,
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
        id: 'refTracks',
        header: 'Ref tracks',
        meta: { encoreFilterFieldId: 'assetRefs' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Ref tracks" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 108,
        minSize: 104,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const n = row.original.refCount;
          return (
            <RepertoireTableMediaEdit
              song={s}
              tooltip="Edit reference tracks"
              ariaLabel={`Edit reference tracks for ${s.title}`}
              section="refs"
              onEdit={openSongResources}
              exclusiveFilter={{ fieldId: 'assetRefs', value: n > 0 ? 'with' : 'without' }}
              onApplyExclusiveFilter={applyExclusiveRepertoireFilter}
              summary={
                n > 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
                  >
                    {n}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    –
                  </Typography>
                )
              }
            />
          );
        },
      },
      {
        id: 'backingTracks',
        header: 'Backing',
        meta: { encoreFilterFieldId: 'assetBacking' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Backing" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 108,
        minSize: 100,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const n = row.original.backingCount;
          return (
            <RepertoireTableMediaEdit
              song={s}
              tooltip="Edit backing tracks"
              ariaLabel={`Edit backing tracks for ${s.title}`}
              section="backing"
              onEdit={openSongResources}
              exclusiveFilter={{ fieldId: 'assetBacking', value: n > 0 ? 'with' : 'without' }}
              onApplyExclusiveFilter={applyExclusiveRepertoireFilter}
              summary={
                n > 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
                  >
                    {n}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    –
                  </Typography>
                )
              }
            />
          );
        },
      },
      {
        id: 'spotifySource',
        header: 'Spotify',
        meta: { encoreFilterFieldId: 'assetSpotify' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Spotify" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 120,
        minSize: 112,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const has = row.original.hasSpotifySource;
          return (
            <RepertoireTableMediaEdit
              song={s}
              tooltip="Edit Spotify song info source"
              ariaLabel={`Edit Spotify source for ${s.title}`}
              section="spotify"
              onEdit={openSongResources}
              exclusiveFilter={{ fieldId: 'assetSpotify', value: has ? 'with' : 'without' }}
              onApplyExclusiveFilter={applyExclusiveRepertoireFilter}
              summary={
                <Typography
                  variant="body2"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: has ? 500 : 400,
                    color: has ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {row.original.spotifySourceLabel}
                </Typography>
              }
            />
          );
        },
      },
      {
        id: 'songCharts',
        header: 'Charts',
        meta: { encoreFilterFieldId: 'assetCharts' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Charts" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 100,
        minSize: 96,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const n = row.original.chartCount;
          return (
            <RepertoireTableMediaEdit
              song={s}
              tooltip="Edit charts"
              ariaLabel={`Edit charts for ${s.title}`}
              section="charts"
              onEdit={openSongResources}
              exclusiveFilter={{ fieldId: 'assetCharts', value: n > 0 ? 'with' : 'without' }}
              onApplyExclusiveFilter={applyExclusiveRepertoireFilter}
              summary={
                n > 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
                  >
                    {n}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    –
                  </Typography>
                )
              }
            />
          );
        },
      },
      {
        id: 'songTakes',
        header: 'Takes',
        meta: { encoreFilterFieldId: 'assetTakes' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Takes" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 100,
        minSize: 96,
        enableSorting: false,
        Cell: ({ row }) => {
          const s = row.original.song;
          const n = row.original.takeCount;
          return (
            <RepertoireTableMediaEdit
              song={s}
              tooltip="Edit takes"
              ariaLabel={`Edit takes for ${s.title}`}
              section="takes"
              onEdit={openSongResources}
              exclusiveFilter={{ fieldId: 'assetTakes', value: n > 0 ? 'with' : 'without' }}
              onApplyExclusiveFilter={applyExclusiveRepertoireFilter}
              summary={
                n > 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'text.primary' }}
                  >
                    {n}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    –
                  </Typography>
                )
              }
            />
          );
        },
      },
      {
        accessorKey: 'venues',
        header: 'Venues',
        meta: { encoreFilterFieldId: 'venue' },
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Venues" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        size: 240,
        minSize: 200,
        // Override the default body cell to allow chip wrapping; the table-wide
        // `wordBreak: 'break-word'; overflow: hidden` rules clipped chip rows otherwise.
        muiTableBodyCellProps: { sx: { whiteSpace: 'normal', overflow: 'visible' } },
        Cell: ({ row }) => {
          const list = row.original.venuesList;
          if (list.length === 0) {
            return (
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                –
              </Typography>
            );
          }
          // Render venues as small chips (parity with PerformancesScreen). Clicking a chip
          // toggles that venue in the Venue filter so users can pivot from "songs played at X"
          // straight from the row without opening any menu.
          return (
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={0.5}
              useFlexGap
              sx={{ minWidth: 0, py: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {list.map((venue) => (
                <Chip
                  key={venue}
                  size="small"
                  label={venue}
                  variant="outlined"
                  clickable
                  onClick={() =>
                    setRepertoireFilterValues((prev) => {
                      const cur = prev.venue ?? [];
                      const next = cur.includes(venue)
                        ? cur.filter((v) => v !== venue)
                        : [...cur, venue];
                      return { ...prev, venue: next };
                    })
                  }
                  sx={{
                    fontWeight: 600,
                    maxWidth: 200,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              ))}
            </Stack>
          );
        },
      },
      {
        accessorKey: 'lastIso',
        header: 'Last performed',
        Header: ({ column }) => (
          <EncoreMrtColumnHeader label="Last performed" column={column} filterBarRef={repertoireFilterBarRef} />
        ),
        sortingFn: 'alphanumeric',
        size: 144,
        minSize: 128,
        Cell: ({ row }) => {
          const latest = row.original.latestPerf;
          const s = row.original.song;
          return (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={REPERTOIRE_CELL_HOVER_ACTIONS_SX}>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  color: row.original.lastIso ? 'text.primary' : 'text.disabled',
                }}
              >
                {row.original.lastDisplay}
              </Typography>
              {latest ? (
                <Tooltip title="Edit latest performance">
                  <IconButton
                    size="small"
                    aria-label={`Edit latest performance for ${s.title}`}
                    className="encore-rep-cell-hover-target"
                    data-encore-row-control
                    onClick={(e) => {
                      e.stopPropagation();
                      setPerfEditing(latest);
                      setPerfSongId(s.id);
                      setPerfOpen(true);
                    }}
                    sx={{ flexShrink: 0, p: 0.25 }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          );
        },
      },
    ],
    [theme, saveSong, tagFilterOptions, debouncedSearch, openSongResources, milestoneWhichFieldOptions, applyExclusiveRepertoireFilter],
  );

  const repDefaultColumnOrder = useMemo(
    () => columns.map((c) => mrtColumnId(c)).filter(Boolean),
    [columns],
  );

  const repertoireTableBodyRowProps = useCallback(
    ({ row }: { row: MRT_Row<EncoreRepertoireMrtRow> }) => ({
      onClick: (e: ReactMouseEvent<HTMLTableRowElement>) => {
        const el = e.target as HTMLElement;
        if (el.closest('[data-encore-row-control]')) return;
        openSong(row.original.song, e);
      },
      onAuxClick: (e: ReactMouseEvent<HTMLTableRowElement>) => {
        if (e.button !== 1) return;
        const el = e.target as HTMLElement;
        if (el.closest('[data-encore-row-control]')) return;
        e.preventDefault();
        openEncoreRouteInBackgroundTab({ kind: 'song', id: row.original.song.id });
      },
      // Stable sx ref → emotion serializes once and reuses the same generated class for every row,
      // saving per-row style-system work during scroll/mount.
      sx: REPERTOIRE_ROW_SX,
    }),
    [openSong],
  );

  const repertoireMrtBaseOptions = encoreMrtRepertoireTableOptions<EncoreRepertoireMrtRow>();
  const repertoireMrtTheme = useMemo(
    () => ({ baseBackgroundColor: theme.palette.background.paper }),
    [theme.palette.background.paper],
  );
  const repertoireDisplayColumnDefOptions = useMemo(
    () => ({
      [MRT_ROW_SELECT_COL]: {
        enableColumnOrdering: false,
        /** `defaultColumn` below uses minSize 100; override so the checkbox column stays icon-width. */
        size: 44,
        minSize: 40,
        maxSize: 56,
        muiTableHeadCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
        muiTableBodyCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
      },
      'mrt-row-actions': { header: '', size: 52 },
    }),
    [],
  );
  const repertoireMrtState = useMemo(
    () => ({
      rowSelection,
      columnVisibility: repColVis,
      columnOrder: repertoireColumnOrderForMrt(viewMode, repColOrder, repDefaultColumnOrder),
      sorting: repSorting,
    }),
    [rowSelection, repColVis, repColOrder, repDefaultColumnOrder, repSorting, viewMode],
  );
  const handleRepertoireColumnVisibilityChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<EncoreRepertoireMrtRow>>[0]['onColumnVisibilityChange']>>[0]) => {
      setRepColVis((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
        persistRepertoireTablePrefs({ columnVisibility: next });
        return next;
      });
    },
    [persistRepertoireTablePrefs],
  );
  const handleRepertoireColumnOrderChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<EncoreRepertoireMrtRow>>[0]['onColumnOrderChange']>>[0]) => {
      setRepColOrder((prev) => {
        const base = repertoireColumnOrderForMrt(viewMode, prev, repDefaultColumnOrder);
        const nextRaw = typeof updater === 'function' ? (updater as (p: string[]) => string[])(base) : updater;
        const next =
          viewMode === 'table'
            ? ensureEncoreMrtSelectLeading(ensureEncoreMrtRowActionsInOrder(nextRaw))
            : ensureEncoreMrtRowActionsInOrder(nextRaw);
        const normalized = withEncoreMrtTrailingSpacer(normalizeEncoreMrtColumnOrder(next));
        persistRepertoireTablePrefs({ columnOrder: normalized });
        return normalized;
      });
    },
    [repDefaultColumnOrder, persistRepertoireTablePrefs, viewMode],
  );
  const handleRepertoireSortingChange = useCallback(
    (updater: Parameters<NonNullable<Parameters<typeof useMaterialReactTable<EncoreRepertoireMrtRow>>[0]['onSortingChange']>>[0]) => {
      setRepSorting((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
        persistRepertoireTablePrefs({ sorting: next });
        return next;
      });
    },
    [persistRepertoireTablePrefs],
  );
  const renderRepertoireRowActions = useCallback(
    ({ row }: { row: { original: EncoreRepertoireMrtRow } }) => (
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
    [],
  );
  const repertoireInitialState = useMemo(
    () => ({ density: 'compact' as const, showColumnFilters: false }),
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    getRowId: getRepertoireRowId,
    ...repertoireMrtBaseOptions,
    defaultColumn: { minSize: 100, maxSize: 640, size: 140 },
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableHiding: true,
    enableColumnActions: false,
    enableColumnOrdering: true,
    mrtTheme: repertoireMrtTheme,
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: repertoireDisplayColumnDefOptions,
    enableRowSelection: viewMode === 'table',
    onRowSelectionChange: setRowSelection,
    state: repertoireMrtState,
    onColumnVisibilityChange: handleRepertoireColumnVisibilityChange,
    onColumnOrderChange: handleRepertoireColumnOrderChange,
    onSortingChange: handleRepertoireSortingChange,
    renderRowActions: renderRepertoireRowActions,
    muiTableBodyRowProps: repertoireTableBodyRowProps,
    initialState: repertoireInitialState,
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
                sx={{ maxWidth: { sm: 560 } }}
              />
            </EncoreToolbarRow>

            <EncoreFilterChipBar
              ref={repertoireFilterBarRef}
              fields={repertoireFilterFieldDefs}
              visibleFieldIds={visibleRepertoireFilterIds}
              values={repertoireFilterValues}
              onChange={onRepertoireFilterChange}
              addableFields={repertoireAddableFilterFields}
              onVisibleFieldIdsChange={setVisibleRepertoireFilterIds}
              defaultPinnedFieldIds={[...REPERTOIRE_FILTER_PINNED]}
              hasActiveFilters={hasActiveFilters}
              onClearAll={clearAllFilters}
            />
            <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} useFlexGap>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, minWidth: 0 }}>
                Showing {repertoireSongs.length} of {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                {hasActiveFilters || searchQuery.trim() ? ' · search or filters applied' : ''}
              </Typography>
              <Stack direction="row" alignItems="center" gap={2.5} sx={{ flexShrink: 0 }}>
                <EncoreMrtColumnsSettingsButton
                  show={viewMode === 'table'}
                  table={table}
                  onResetLayout={resetRepertoireTableLayout}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={viewMode}
                  onChange={(_e, next: RepertoireViewMode | null) => {
                    if (next) setViewMode(next);
                  }}
                  aria-label="Repertoire layout"
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

      {songs.length === 0 && (
        <Stack spacing={2} sx={{ py: 5, alignItems: 'center', px: 2, maxWidth: 560, mx: 'auto' }}>
          <Typography color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65 }}>
            Nothing here yet. Add a song to start. Data stays on this device until you sign in to Google for Drive sync
            (Account menu).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.65, maxWidth: 480 }}>
            Playlist import is usually the fastest way to grow the library. Spotify rows give cleaner titles and artists
            than YouTube alone, so many people start from a Spotify playlist and add YouTube playlists in the same import
            when they need to.
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
              component="a"
              href={encoreAppHref({ kind: 'help' })}
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
          {/*
            Structured bulk-action bar: safe edits sit on the main row, destructive actions live
            in the overflow menu so they aren't a one-click misfire on a toolbar with selected
            rows. Tag input upgrades to an Autocomplete with existing-tag suggestions.
          */}
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
                setBulkRefreshSpotifyOpen(true);
              }}
            >
              Refresh song info from Spotify…
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setBulkOverflowAnchor(null);
                setBulkDeleteOpen(true);
              }}
              sx={{ color: 'error.main' }}
            >
              Remove from library…
            </MenuItem>
          </Menu>
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: { xs: 2.25, sm: 2.75 },
          }}
        >
          {repertoireSongs.map((s) => {
            const perfs = perfBySong.get(s.id) ?? [];
            const ms = milestoneProgressSummary(s, repertoireExtras.milestoneTemplate);
            return (
              <RepertoireGridCard
                key={s.id}
                song={s}
                perfs={perfs}
                milestoneShort={ms.labelShort}
                milestoneTooltip={ms.tooltip}
                milestoneTotal={ms.total}
                tagFilterOptions={tagFilterOptions}
                debouncedSearch={debouncedSearch}
                onOpenSong={openSong}
                onEditPerformance={onGridEditPerformance}
                onLogPerformance={onGridLogPerformance}
                onSongMenu={onGridSongMenu}
                onTagsCommit={onGridTagsCommit}
              />
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
            const perfs = perfBySong.get(song.id) ?? [];
            if (perfs.length === 0) return;
            if (perfs.length === 1) {
              setPerfEditing(perfs[0]);
              setPerfSongId(song.id);
              setPerfOpen(true);
              return;
            }
            setPerfBrowse({ song, perfs });
          }}
          disabled={!menuAnchor?.song || (perfBySong.get(menuAnchor.song.id) ?? []).length === 0}
        >
          Edit performance
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
          Log performance
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

      <Dialog open={Boolean(perfBrowse)} onClose={() => setPerfBrowse(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>
          {perfBrowse ? `Edit performance: ${perfBrowse.song.title}` : 'Edit performance'}
        </DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This song has multiple performances. Pick one to edit.
          </Typography>
          <List disablePadding>
            {perfBrowse?.perfs.map((p) => {
              const line = `${formatShortDate(p.date)} · ${normalizeVenueTag(p.venueTag)}`;
              return (
                <ListItemButton
                  key={p.id}
                  onClick={() => {
                    const song = perfBrowse.song;
                    setPerfBrowse(null);
                    setPerfEditing(p);
                    setPerfSongId(song.id);
                    setPerfOpen(true);
                  }}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText primary={line} primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }} />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setPerfBrowse(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>

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
          onSave={async (p) => {
            await savePerformance(p);
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

      <SongResourcesEditDialog
        open={Boolean(songResourcesTarget)}
        song={songResourcesTarget}
        initialSection={songResourcesSection}
        onClose={() => {
          setSongResourcesTarget(null);
          setSongResourcesSection('all');
        }}
      />

      <Dialog open={bulkRefreshSpotifyOpen} onClose={() => setBulkRefreshSpotifyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={encoreDialogTitleSx}>Refresh song info from Spotify</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            Overwrites <strong>title</strong> and <strong>artist</strong> on each selected song using the linked Spotify
            track’s catalog metadata. Songs without a Spotify source on file are skipped.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Selected: <strong>{bulkSpotifyRefreshPlan.total}</strong>.{' '}
            <strong>{bulkSpotifyRefreshPlan.eligibleCount}</strong> will refresh from Spotify metadata.
            {bulkSpotifyRefreshPlan.skippedNoSource > 0 ? (
              <>
                {' '}
                (<strong>{bulkSpotifyRefreshPlan.skippedNoSource}</strong> skipped: no Spotify source on file.)
              </>
            ) : null}
          </Typography>
          {!spotifyClientId ? (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Spotify is not configured for this build (<code>VITE_SPOTIFY_CLIENT_ID</code>).
            </Alert>
          ) : null}
          {spotifyClientId && !spotifyLinked ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Connect Spotify from the Account menu so Encore can read track metadata.
            </Alert>
          ) : null}
          {bulkSpotifyRefreshPlan.eligibleCount === 0 ? (
            <Alert severity="info">None of the selected rows have a Spotify source to refresh.</Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setBulkRefreshSpotifyOpen(false)}>Cancel</Button>
          {spotifyClientId && !spotifyLinked ? (
            <Button
              variant="outlined"
              onClick={() => {
                setBulkRefreshSpotifyOpen(false);
                void connectSpotify();
              }}
            >
              Connect Spotify
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => void runBulkRefreshSpotifyMetadata()}
            disabled={
              !spotifyClientId ||
              !spotifyLinked ||
              bulkSpotifyRefreshPlan.eligibleCount === 0
            }
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkTagOpen} onClose={() => setBulkTagOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={encoreDialogTitleSx}>Add tag to {selectedSongIds.size} songs</DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          {/*
            Autocomplete (freeSolo) so users can pick an existing tag without typo risk OR add a
            net-new one. Suggestions come from `tagFilterOptions` which already aggregates every
            tag in the library.
          */}
          <Autocomplete
            freeSolo
            autoSelect
            size="small"
            fullWidth
            options={tagFilterOptions}
            value={bulkTagInput}
            onInputChange={(_, value) => setBulkTagInput(value)}
            onChange={(_, value) => setBulkTagInput(typeof value === 'string' ? value : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Tag"
                placeholder={tagFilterOptions.length ? 'e.g. Wedding (or pick an existing tag)' : 'e.g. Wedding'}
                helperText={tagFilterOptions.length ? `${tagFilterOptions.length} existing tags` : undefined}
              />
            )}
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
      <Snackbar
        open={Boolean(bulkSpotifyRefreshToast)}
        autoHideDuration={10_000}
        onClose={() => setBulkSpotifyRefreshToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setBulkSpotifyRefreshToast(null)}
          severity={bulkSpotifyRefreshToast?.severity ?? 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {bulkSpotifyRefreshToast?.message ?? ''}
        </Alert>
      </Snackbar>
    </Box>
  );
}
