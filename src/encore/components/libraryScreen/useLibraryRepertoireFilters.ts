import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { EncorePerformance, EncoreRepertoireSavedSearch, EncoreSong } from '../../types';
import type { EncoreActionsContextValue } from '../../context/EncoreActionsContext';
import type { RepertoireExtrasRow } from '../../db/encoreDb';
import { buildLibraryRepertoireFilterFieldDefs } from '../../repertoire/buildLibraryRepertoireFilterFieldDefs';
import {
  derivePlaylistImportTagsFromFilters,
  filterSongsByRepertoireSavedSearchBundle,
  normalizeExcludedRepertoireFieldIds,
  normalizeSavedSearchFilterValues,
} from '../../repertoire/repertoireSavedSearchFilter';
import { type EncoreFilterChipBarHandle, type EncoreFilterFieldConfig } from '../../ui/EncoreFilterChipBar';
import {
  encoreDateRangeFromFilterRecord,
  isEncoreDateRangeActive,
  type EncoreDateRangeFilterValue,
} from '../../utils/encoreDateRangeFilter';
import { patchEncoreFilterDateRange } from '../../utils/encoreFilterFieldHelpers';
import { useDebouncedString } from '../../utils/useDebouncedString';
import {
  REPERTOIRE_FILTER_EMPTY,
  REPERTOIRE_FILTER_PINNED,
} from '../libraryScreenHelpers';

export type UseLibraryRepertoireFiltersArgs = {
  tabActive: boolean;
  songs: EncoreSong[];
  performances: EncorePerformance[];
  repertoireExtras: Pick<
    RepertoireExtrasRow,
    'venueCatalog' | 'milestoneTemplate' | 'repertoireSavedSearches'
  >;
  saveRepertoireExtras: EncoreActionsContextValue['saveRepertoireExtras'];
  perfBySong: Map<string, EncorePerformance[]>;
};

export type UseLibraryRepertoireFiltersResult = {
  searchQuery: string;
  setSearchQuery: (next: string) => void;
  debouncedSearch: string;
  repertoireFilterValues: Record<string, string[]>;
  excludedRepertoireFilterIds: string[];
  setExcludedRepertoireFilterIds: (next: string[]) => void;
  visibleRepertoireFilterIds: string[];
  setVisibleRepertoireFilterIds: (next: string[]) => void;
  repertoireFilterBarRef: RefObject<EncoreFilterChipBarHandle | null>;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  repertoireSavedSearches: EncoreRepertoireSavedSearch[];
  saveCurrentViewAsSearch: (name: string) => void;
  applySavedSearch: (s: EncoreRepertoireSavedSearch) => void;
  repertoireFilterFieldDefs: EncoreFilterFieldConfig[];
  repertoireAddableFilterFields: EncoreFilterFieldConfig[];
  onRepertoireFilterChange: (fieldId: string, nextValues: string[]) => void;
  onRepertoireDateRangeChange: (fieldId: string, range: EncoreDateRangeFilterValue) => void;
  applyExclusiveRepertoireFilter: (fieldId: string, value: string) => void;
  repertoireSongs: EncoreSong[];
};

/** Search + chip-bar filter state for Library repertoire (controlled leaf: {@link LibraryRepertoireFiltersPanel}). */
export function useLibraryRepertoireFilters(
  args: UseLibraryRepertoireFiltersArgs,
): UseLibraryRepertoireFiltersResult {
  const {
    tabActive: heavyListTabActive,
    songs,
    performances,
    repertoireExtras,
    saveRepertoireExtras,
    perfBySong,
  } = args;

  const repertoireSongsCacheRef = useRef<EncoreSong[]>([]);
  const repertoireFilterFieldDefsCacheRef = useRef<EncoreFilterFieldConfig[]>([]);

  const extrasRef = useRef(repertoireExtras);
  extrasRef.current = repertoireExtras;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedString(searchQuery, 220);
  const [repertoireFilterValues, setRepertoireFilterValues] = useState<Record<string, string[]>>(
    () => ({ ...REPERTOIRE_FILTER_EMPTY }),
  );
  const [excludedRepertoireFilterIds, setExcludedRepertoireFilterIds] = useState<string[]>([]);
  const [visibleRepertoireFilterIds, setVisibleRepertoireFilterIds] = useState<string[]>([
    ...REPERTOIRE_FILTER_PINNED,
  ]);

  const repertoireFilterBarRef = useRef<EncoreFilterChipBarHandle>(null);

  const perfPresence =
    repertoireFilterValues.performed[0] === 'with'
      ? 'with'
      : repertoireFilterValues.performed[0] === 'none'
        ? 'none'
        : 'all';
  const practicingSel = repertoireFilterValues.practicing[0];
  const practicingFilter =
    practicingSel === 'practicing'
      ? 'practicing'
      : practicingSel === 'not_practicing'
        ? 'not_practicing'
        : 'all';

  const repertoireSongs = useMemo(() => {
    if (!heavyListTabActive) return repertoireSongsCacheRef.current;
    const list = filterSongsByRepertoireSavedSearchBundle(
      songs,
      performances,
      perfBySong,
      repertoireExtras.milestoneTemplate,
      debouncedSearch,
      repertoireFilterValues,
      excludedRepertoireFilterIds,
    );
    repertoireSongsCacheRef.current = list;
    return list;
  }, [
    heavyListTabActive,
    songs,
    performances,
    perfBySong,
    repertoireExtras.milestoneTemplate,
    debouncedSearch,
    repertoireFilterValues,
    excludedRepertoireFilterIds,
  ]);

  const perfDateRange = useMemo(
    () => encoreDateRangeFromFilterRecord(repertoireFilterValues, 'perfDate'),
    [repertoireFilterValues],
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      perfPresence !== 'all' ||
      practicingFilter !== 'all' ||
      excludedRepertoireFilterIds.length > 0 ||
      (repertoireFilterValues.venue ?? []).length > 0 ||
      (repertoireFilterValues.tags ?? []).length > 0 ||
      (repertoireFilterValues.artist ?? []).length > 0 ||
      (repertoireFilterValues.perfKey ?? []).length > 0 ||
      isEncoreDateRangeActive(perfDateRange) ||
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
    setExcludedRepertoireFilterIds([]);
    setVisibleRepertoireFilterIds([...REPERTOIRE_FILTER_PINNED]);
  }, []);

  const repertoireSavedSearches = repertoireExtras.repertoireSavedSearches ?? [];

  const saveCurrentViewAsSearch = useCallback(
    (name: string) => {
      const now = new Date().toISOString();
      const fv = normalizeSavedSearchFilterValues(repertoireFilterValues);
      const excluded = normalizeExcludedRepertoireFieldIds(excludedRepertoireFilterIds);
      const tags = derivePlaylistImportTagsFromFilters(fv, excluded);
      const next: EncoreRepertoireSavedSearch = {
        id: crypto.randomUUID(),
        name,
        updatedAt: now,
        searchQuery,
        visibleFieldIds: [...visibleRepertoireFilterIds],
        filterValues: fv,
        excludedFieldIds: excluded.length > 0 ? excluded : undefined,
        playlistImportTags: tags,
      };
      void saveRepertoireExtras({
        repertoireSavedSearches: [...(extrasRef.current.repertoireSavedSearches ?? []), next],
      });
    },
    [
      excludedRepertoireFilterIds,
      repertoireFilterValues,
      saveRepertoireExtras,
      searchQuery,
      visibleRepertoireFilterIds,
    ],
  );

  const applySavedSearch = useCallback((s: EncoreRepertoireSavedSearch) => {
    setSearchQuery(s.searchQuery);
    setRepertoireFilterValues(normalizeSavedSearchFilterValues(s.filterValues));
    setExcludedRepertoireFilterIds(normalizeExcludedRepertoireFieldIds(s.excludedFieldIds));
    setVisibleRepertoireFilterIds(
      s.visibleFieldIds.length > 0 ? [...s.visibleFieldIds] : [...REPERTOIRE_FILTER_PINNED],
    );
  }, []);

  const repertoireFilterFieldDefs = useMemo((): EncoreFilterFieldConfig[] => {
    if (!heavyListTabActive) return repertoireFilterFieldDefsCacheRef.current;
    const next = buildLibraryRepertoireFilterFieldDefs({
      songs,
      performances,
      venueCatalog: repertoireExtras.venueCatalog,
      milestoneTemplate: repertoireExtras.milestoneTemplate,
    });
    repertoireFilterFieldDefsCacheRef.current = next;
    return next;
  }, [heavyListTabActive, songs, performances, repertoireExtras.venueCatalog, repertoireExtras.milestoneTemplate]);

  const repertoireAddableFilterFields = useMemo(() => {
    const pinned = new Set<string>(REPERTOIRE_FILTER_PINNED);
    return repertoireFilterFieldDefs.filter((f) => !pinned.has(f.id));
  }, [repertoireFilterFieldDefs]);

  const onRepertoireFilterChange = useCallback((fieldId: string, nextValues: string[]) => {
    setRepertoireFilterValues((prev) => ({ ...prev, [fieldId]: nextValues }));
  }, []);

  const onRepertoireDateRangeChange = useCallback((fieldId: string, range: EncoreDateRangeFilterValue) => {
    setRepertoireFilterValues((prev) => patchEncoreFilterDateRange(prev, fieldId, range));
  }, []);

  const applyExclusiveRepertoireFilter = useCallback((fieldId: string, value: string) => {
    setVisibleRepertoireFilterIds((prev) => (prev.includes(fieldId) ? prev : [...prev, fieldId]));
    setRepertoireFilterValues((prev) => ({ ...prev, [fieldId]: [value] }));
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    repertoireFilterValues,
    excludedRepertoireFilterIds,
    setExcludedRepertoireFilterIds,
    visibleRepertoireFilterIds,
    setVisibleRepertoireFilterIds,
    repertoireFilterBarRef,
    hasActiveFilters,
    clearAllFilters,
    repertoireSavedSearches,
    saveCurrentViewAsSearch,
    applySavedSearch,
    repertoireFilterFieldDefs,
    repertoireAddableFilterFields,
    onRepertoireFilterChange,
    onRepertoireDateRangeChange,
    applyExclusiveRepertoireFilter,
    repertoireSongs,
  };
}
