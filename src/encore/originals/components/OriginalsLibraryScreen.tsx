import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { LabsListLoadingState } from '../../../shared/components/LabsListLoadingState';
import { chordProLyricSnippet } from '../../../shared/music/chordPro/chordProText';
import type { RepertoireViewMode } from '../../components/libraryScreenHelpers';
import type { EncoreOriginalsActionsContextValue } from '../../context/EncoreOriginalsActionsContext';
import { useEncoreOriginalsActions } from '../../context/EncoreOriginalsActionsContext';
import { useEncoreOriginalsLibrary } from '../../context/EncoreOriginalsLibraryContext';
import { EncoreFilterChipBar } from '../../ui/EncoreFilterChipBar';
import { EncorePageHeader } from '../../ui/EncorePageHeader';
import { EncoreToolbarRow } from '../../ui/EncoreToolbarRow';
import { encoreMaxWidthPage } from '../../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../../theme/encoreM3Layout';
import { useDebouncedString } from '../../utils/useDebouncedString';
import {
  encoreDateInRange,
  encoreDateRangeFromFilterRecord,
  isEncoreDateRangeActive,
} from '../../utils/encoreDateRangeFilter';
import { patchEncoreFilterDateRange } from '../../utils/encoreFilterFieldHelpers';
import {
  encoreTabBodyPropsAreEqual,
  useEncoreTabFrozenSnapshot,
} from '../../utils/useEncoreTabFrozenSnapshot';
import { useEncoreHeavyListTabLaidOut } from '../../utils/useEncoreHeavyListTabLaidOut';
import { navigateEncore } from '../../routes/encoreAppHash';
import { buildOriginalsFilterFieldDefs } from '../buildOriginalsFilterFieldDefs';
import { stashPendingOriginalDraft } from '../pendingOriginalDraft';
import { createBlankOriginalSong, originalSongStartedDate, type EncoreOriginalSong } from '../types';
import { OriginalsLibraryList } from './OriginalsLibraryList';
import { seedOriginalsQueueE2e, E2E_ORIGINALS_QUEUE_A_ID, isE2eOriginalsQueueRoute } from '../e2eSeedOriginalsQueue';

const ORIGINALS_VIEW_STORAGE_KEY = 'encore.originals.libraryView';

const ORIGINALS_FILTER_EMPTY: Record<string, string[]> = {
  key: [],
  startedAfter: [],
  startedBefore: [],
  updatedAfter: [],
  updatedBefore: [],
};

function readViewMode(): RepertoireViewMode {
  try {
    return window.localStorage.getItem(ORIGINALS_VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'table';
  } catch {
    return 'table';
  }
}

export type OriginalsLibraryScreenProps = {
  /** When false, skip filter/search rebuilds while keep-alive hidden (Dexie still updates). */
  listActive?: boolean;
  onListLaidOut?: () => void;
};

type OriginalsLibraryScreenBodyProps = OriginalsLibraryScreenProps & {
  tabActive: boolean;
  originals: EncoreOriginalSong[];
  originalsHydrated: boolean;
  saveOriginal: EncoreOriginalsActionsContextValue['saveOriginal'];
};

const OriginalsLibraryScreenBody = memo(function OriginalsLibraryScreenBody({
  tabActive,
  originals,
  originalsHydrated,
  saveOriginal,
  onListLaidOut,
}: OriginalsLibraryScreenBodyProps): ReactElement {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({ ...ORIGINALS_FILTER_EMPTY }));
  const [viewMode, setViewMode] = useState<RepertoireViewMode>(() => readViewMode());
  const [creating, setCreating] = useState(false);
  const filteredCacheRef = useRef<EncoreOriginalSong[]>([]);
  const debouncedSearch = useDebouncedString(search, 220);

  useEncoreHeavyListTabLaidOut(tabActive, originalsHydrated, onListLaidOut);

  useEffect(() => {
    if (!isE2eOriginalsQueueRoute()) return;
    setViewMode('table');
    void seedOriginalsQueueE2e();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORIGINALS_VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  const filterFields = useMemo(() => buildOriginalsFilterFieldDefs(originals), [originals]);

  const filtered = useMemo(() => {
    if (!tabActive) return filteredCacheRef.current;
    const q = debouncedSearch.trim().toLowerCase();
    const keyFilter = filterValues.key?.[0];
    const startedRange = encoreDateRangeFromFilterRecord(filterValues, 'started');
    const updatedRange = encoreDateRangeFromFilterRecord(filterValues, 'updated');
    const next = originals.filter((o) => {
      if (keyFilter && o.key !== keyFilter) return false;
      if (!encoreDateInRange(originalSongStartedDate(o), startedRange)) return false;
      if (!encoreDateInRange(o.updatedAt, updatedRange)) return false;
      if (!q) return true;
      const snippet = chordProLyricSnippet(o.lyricsAndChords, 200).toLowerCase();
      return o.title.toLowerCase().includes(q) || snippet.includes(q);
    });
    filteredCacheRef.current = next;
    return next;
  }, [debouncedSearch, filterValues, tabActive, originals]);

  const saveSongInline = useCallback(
    (song: EncoreOriginalSong) => {
      void saveOriginal(song, { silentUndo: true });
    },
    [saveOriginal],
  );

  const startNewOriginal = () => {
    if (creating) return;
    setCreating(true);
    const song = createBlankOriginalSong();
    stashPendingOriginalDraft(song);
    navigateEncore({ kind: 'original', id: song.id });
    void saveOriginal(song, { silentUndo: true }).finally(() => setCreating(false));
  };

  const viewToggle = (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={viewMode}
      onChange={(_, next: RepertoireViewMode | null) => {
        if (next) setViewMode(next);
      }}
      aria-label="Originals layout"
    >
      <Tooltip title="Table view">
        <ToggleButton value="table" aria-label="Table view">
          <ViewListIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Song dashboard">
        <ToggleButton value="grid" aria-label="Song dashboard">
          <ViewSidebarOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );

  const awaitingE2eSeed =
    isE2eOriginalsQueueRoute() &&
    originalsHydrated &&
    !originals.some((song) => song.id === E2E_ORIGINALS_QUEUE_A_ID);

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <EncorePageHeader
          title="Originals"
          description="Your songwriting drafts. brainstorm, chart, demo takes, and exports. Stored locally and backed up to Google Drive."
          actions={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={creating}
              onClick={() => void startNewOriginal()}
            >
              New Original
            </Button>
          }
        />
      </Box>
      <EncoreToolbarRow sx={{ mt: 2, mb: 0 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search titles and lyrics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ 'aria-label': 'Search originals' }}
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
      <Box sx={{ mt: 1.5, mb: 0.5, flexShrink: 0 }}>
        <EncoreFilterChipBar
          fields={filterFields}
          visibleFieldIds={['key', 'started', 'updated']}
          values={filterValues}
          onChange={(id, vals) => setFilterValues((prev) => ({ ...prev, [id]: vals }))}
          onDateRangeChange={(fieldId, range) =>
            setFilterValues((prev) => patchEncoreFilterDateRange(prev, fieldId, range))
          }
          hasActiveFilters={Boolean(
            filterValues.key?.length ||
              isEncoreDateRangeActive(encoreDateRangeFromFilterRecord(filterValues, 'started')) ||
              isEncoreDateRangeActive(encoreDateRangeFromFilterRecord(filterValues, 'updated')),
          )}
          onClearAll={() => setFilterValues({ ...ORIGINALS_FILTER_EMPTY })}
        />
      </Box>
      {!originalsHydrated || awaitingE2eSeed ? (
        <LabsListLoadingState label="Loading originals" variant="skeleton" sx={{ mt: 2 }} />
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {originals.length === 0
            ? 'Nothing here yet. Add an original from the toolbar.'
            : 'No matches. Clear filters or try a shorter search.'}
        </Typography>
      ) : (
        <OriginalsLibraryList
          rows={filtered}
          search={debouncedSearch}
          listActive={tabActive}
          viewMode={viewMode}
          onSaveSong={saveSongInline}
          toolbarTrailing={viewToggle}
        />
      )}
    </Box>
  );
}, encoreTabBodyPropsAreEqual);

export function OriginalsLibraryScreen({
  listActive = true,
  onListLaidOut,
}: OriginalsLibraryScreenProps): ReactElement {
  const { originals, originalsHydrated } = useEncoreOriginalsLibrary();
  const { saveOriginal } = useEncoreOriginalsActions();
  const bodyProps = useEncoreTabFrozenSnapshot(listActive, {
    tabActive: listActive,
    originals,
    originalsHydrated,
    saveOriginal,
    onListLaidOut,
  });
  return <OriginalsLibraryScreenBody {...bodyProps} listActive={listActive} />;
}
