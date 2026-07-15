import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useLiveQuery } from 'dexie-react-hooks';
import PackCollectionCard from '../components/PackCollectionCard';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import PracticeSessionConfigProvider, {
  PracticeSessionControls,
  PracticeSessionFooter,
} from '../components/PracticeSessionControls';
import { gestureDb } from '../db/gestureDb';
import { isIncompleteUploadPack } from '../drive/gestureUploadActivity';
import {
  collectGestureTagsForFilterBar,
  countGestureCollectionsPerTagForFilterBar,
  countNsfwTaggedCollections,
  packMatchesGestureTagFilters,
  packPassesNsfwVisibility,
  packShouldBlurNsfwPreviews,
} from '../drive/gesturePackTags';
import { useGestureNsfwVisibility } from '../hooks/useGestureNsfwVisibility';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from '../hooks/gestureLiveQueryEmpty';
import { useGesturePackStats, resolveGesturePackCoverFileIds } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
import { gestureAppHref, handleSpaLinkClick } from '../routes/gestureAppHash';
import { readGesturePracticeSessionConfig } from '../practice/gesturePracticeConfigStorage';
import {
  formatPracticeSelectionHint,
  prunePracticeSelectionState,
  selectionAfterPracticeTagFilterChange,
  sessionPackIdsFromSelection,
} from '../practice/gesturePracticeSelection';
import type { SessionConfig, GesturePack } from '../types';

type PracticeCollectionGridProps = {
  gridPacks: GesturePack[];
  showNsfwCollections: boolean;
  coverIds: Map<string, string[]>;
  counts: Map<string, number>;
  drawnSets: Map<string, Set<string>>;
  selectedSet: Set<string>;
  suppressTags: boolean;
  previewFetchEnabled: boolean;
  onTogglePack: (packId: string) => void;
};

const PracticeCollectionGrid = memo(function PracticeCollectionGrid({
  gridPacks,
  showNsfwCollections,
  coverIds,
  counts,
  drawnSets,
  selectedSet,
  suppressTags,
  previewFetchEnabled,
  onTogglePack,
}: PracticeCollectionGridProps): React.ReactElement {
  const toggleHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const pack of gridPacks) {
      map.set(pack.id, () => onTogglePack(pack.id));
    }
    return map;
  }, [gridPacks, onTogglePack]);

  return (
    <div className="gesture-collection-grid gesture-collection-grid--practice">
      {gridPacks.map((pack) => (
        <PackCollectionCard
          key={pack.id}
          pack={pack}
          driveFileIds={resolveGesturePackCoverFileIds(pack, coverIds)}
          photoCount={counts.get(pack.id) ?? 0}
          drawnCount={drawnSets.get(pack.id)?.size ?? 0}
          mode="select"
          selected={selectedSet.has(pack.id)}
          suppressTags={suppressTags}
          previewFetchEnabled={previewFetchEnabled}
          blurNsfwPreviews={packShouldBlurNsfwPreviews(pack, showNsfwCollections)}
          onToggleSelect={toggleHandlers.get(pack.id)}
        />
      ))}
    </div>
  );
});

interface PracticeTabProps {
  onStart: (config: SessionConfig) => void;
  onNeedCollections: () => void;
  activeTagFilters: string[];
  onActiveTagFiltersChange: (tags: string[]) => void;
  previewFetchEnabled?: boolean;
}

export default function PracticeTab({
  onStart,
  onNeedCollections,
  activeTagFilters,
  onActiveTagFiltersChange,
  previewFetchEnabled = true,
}: PracticeTabProps): React.ReactElement {
  const { packs, packsHydrated } = useGesturePacks();
  const { counts, coverIds, drawnSets, statsHydrated } = useGesturePackStats();
  const { showNsfwCollections, setShowNsfwCollections } = useGestureNsfwVisibility();

  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(
    () => readGesturePracticeSessionConfig()?.selectedPackIds ?? [],
  );

  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  const readyPacks = useMemo(
    () => packs.filter((p) => !isIncompleteUploadPack(p, counts.get(p.id) ?? 0)),
    [counts, packs],
  );

  const nsfwTaggedCount = useMemo(() => countNsfwTaggedCollections(packs), [packs]);

  const tagCounts = useMemo(
    () => countGestureCollectionsPerTagForFilterBar(readyPacks),
    [readyPacks],
  );
  const filterBarTags = useMemo(() => collectGestureTagsForFilterBar(readyPacks), [readyPacks]);

  const gridPacks = useMemo(
    () =>
      readyPacks.filter(
        (p) =>
          (counts.get(p.id) ?? 0) > 0 && packMatchesGestureTagFilters(p, activeTagFilters),
      ),
    [activeTagFilters, counts, readyPacks],
  );

  const practicePacks = useMemo(
    () => gridPacks.filter((p) => packPassesNsfwVisibility(p, showNsfwCollections)),
    [gridPacks, showNsfwCollections],
  );

  const packIdsWithPhotos = useMemo(() => practicePacks.map((p) => p.id), [practicePacks]);

  const allPackIdsWithPhotos = useMemo(
    () => readyPacks.filter((p) => (counts.get(p.id) ?? 0) > 0).map((p) => p.id),
    [counts, readyPacks],
  );

  const selectedSet = useMemo(() => new Set(selectedPackIds), [selectedPackIds]);

  const hadStoredSelection = useRef(
    readGesturePracticeSessionConfig()?.selectedPackIds != null,
  );
  useEffect(() => {
    if (!hadStoredSelection.current && allPackIdsWithPhotos.length > 0) {
      setSelectedPackIds(allPackIdsWithPhotos);
      hadStoredSelection.current = true;
    }
  }, [allPackIdsWithPhotos]);

  useEffect(() => {
    if (allPackIdsWithPhotos.length === 0) return;
    setSelectedPackIds((prev) => {
      const valid = prev.filter((id) => allPackIdsWithPhotos.includes(id));
      return valid.length === prev.length ? prev : valid;
    });
  }, [allPackIdsWithPhotos]);

  // Drop packs that are filtered out or NSFW-hidden so the session cannot “ghost select”.
  useEffect(() => {
    setSelectedPackIds((prev) => prunePracticeSelectionState(prev, packIdsWithPhotos));
  }, [packIdsWithPhotos]);

  const togglePack = useCallback((packId: string) => {
    const pack = gridPacks.find((entry) => entry.id === packId);
    if (pack && packShouldBlurNsfwPreviews(pack, showNsfwCollections)) return;
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId],
    );
  }, [gridPacks, showNsfwCollections]);

  const matchingPracticePackIdsForFilters = useCallback(
    (filters: string[]) =>
      readyPacks
        .filter(
          (pack) =>
            (counts.get(pack.id) ?? 0) > 0 &&
            packMatchesGestureTagFilters(pack, filters) &&
            packPassesNsfwVisibility(pack, showNsfwCollections),
        )
        .map((pack) => pack.id),
    [counts, readyPacks, showNsfwCollections],
  );

  const toggleTagFilter = useCallback(
    (tag: string) => {
      const wasActive = activeTagFilters.includes(tag);
      const nextFilters = wasActive
        ? activeTagFilters.filter((t) => t !== tag)
        : [...activeTagFilters, tag];
      onActiveTagFiltersChange(nextFilters);
      setSelectedPackIds((prev) =>
        selectionAfterPracticeTagFilterChange({
          previousSelectedIds: prev,
          nextFilters,
          matchingPracticePackIds: matchingPracticePackIdsForFilters(nextFilters),
        }),
      );
    },
    [
      activeTagFilters,
      matchingPracticePackIdsForFilters,
      onActiveTagFiltersChange,
    ],
  );

  const clearTagFilters = useCallback(() => {
    onActiveTagFiltersChange([]);
  }, [onActiveTagFiltersChange]);

  const selectAllVisible = useCallback(() => {
    // Replace with the visible set when filtering so we never keep off-grid packs.
    if (activeTagFilters.length > 0) {
      setSelectedPackIds([...packIdsWithPhotos]);
      return;
    }
    setSelectedPackIds((prev) => [...new Set([...prev, ...packIdsWithPhotos])]);
  }, [activeTagFilters.length, packIdsWithPhotos]);

  const deselectAllVisible = useCallback(() => {
    setSelectedPackIds((prev) => prev.filter((id) => !packIdsWithPhotos.includes(id)));
  }, [packIdsWithPhotos]);

  const sessionPackIds = useMemo(
    () => sessionPackIdsFromSelection(selectedPackIds, packIdsWithPhotos),
    [packIdsWithPhotos, selectedPackIds],
  );

  const packFilesRaw = useLiveQuery(
    () =>
      sessionPackIds.length === 0
        ? Promise.resolve(GESTURE_EMPTY_PACK_FILES)
        : gestureDb.packFiles.where('packId').anyOf(sessionPackIds).toArray(),
    [sessionPackIds.join(',')],
    undefined,
  );
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;

  const visibleSelectedCount = useMemo(
    () => packIdsWithPhotos.filter((id) => selectedSet.has(id)).length,
    [packIdsWithPhotos, selectedSet],
  );

  const selectionHint = formatPracticeSelectionHint(
    visibleSelectedCount,
    packIdsWithPhotos.length,
    sessionPackIds.length,
  );

  const collectionsReady = packsHydrated && statsHydrated;

  const nsfwFilterBarProps = {
    nsfwTaggedCount,
    showNsfwCollections,
    onShowNsfwCollectionsChange: setShowNsfwCollections,
  };

  if (!collectionsReady) {
    return (
      <div className="gesture-tab-panel">
        <GestureTabLoading />
      </div>
    );
  }

  if (gridPacks.length === 0 && activeTagFilters.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">Add a collection first</Typography>
          <Typography className="gesture-empty-copy">
            Practice pulls photos from your collections. Upload or link a folder to begin.
          </Typography>
          <Button
            variant="contained"
            component="a"
            href={gestureAppHref({ kind: 'collections' })}
            onClick={(e) => handleSpaLinkClick(e, onNeedCollections)}
          >
            Go to collections
          </Button>
        </div>
      </div>
    );
  }

  if (gridPacks.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <GestureTagFilterBar
          tags={filterBarTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={clearTagFilters}
          {...nsfwFilterBarProps}
        />
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections match these tags</Typography>
          <Typography className="gesture-empty-copy">
            Clear the tag filters or tag collections on the Collections tab.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <PracticeSessionConfigProvider
      selectedPackIds={sessionPackIds}
      activeTagFilters={activeTagFilters}
      packFiles={packFiles}
      drawHistory={drawHistory}
      onStart={onStart}
    >
      <div className="gesture-tab-panel gesture-practice-panel">
        <PracticeSessionControls />

        <GestureTagFilterBar
          tags={filterBarTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={clearTagFilters}
          selectionHint={selectionHint}
          onSelectAllShown={packIdsWithPhotos.length > 0 ? selectAllVisible : undefined}
          onDeselectAllShown={packIdsWithPhotos.length > 0 ? deselectAllVisible : undefined}
          {...nsfwFilterBarProps}
        />

        <Typography component="h2" className="gesture-practice-label">
          Collections
        </Typography>
        <PracticeCollectionGrid
          gridPacks={gridPacks}
          showNsfwCollections={showNsfwCollections}
          coverIds={coverIds}
          counts={counts}
          drawnSets={drawnSets}
          selectedSet={selectedSet}
          suppressTags={activeTagFilters.length > 0}
          previewFetchEnabled={previewFetchEnabled}
          onTogglePack={togglePack}
        />

        <PracticeSessionFooter />
      </div>
    </PracticeSessionConfigProvider>
  );
}
