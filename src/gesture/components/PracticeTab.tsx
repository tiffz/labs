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
  countGestureCollectionsPerTag,
  packHasGestureTag,
  packMatchesGestureTagFilters,
} from '../drive/gesturePackTags';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from '../hooks/gestureLiveQueryEmpty';
import { useGesturePackStats, resolveGesturePackCoverFileIds } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
import { readGesturePracticeSessionConfig } from '../practice/gesturePracticeConfigStorage';
import type { SessionConfig, GesturePack } from '../types';

type PracticeCollectionGridProps = {
  practicePacks: GesturePack[];
  coverIds: Map<string, string[]>;
  counts: Map<string, number>;
  drawnSets: Map<string, Set<string>>;
  selectedSet: Set<string>;
  suppressTags: boolean;
  previewFetchEnabled: boolean;
  onTogglePack: (packId: string) => void;
};

const PracticeCollectionGrid = memo(function PracticeCollectionGrid({
  practicePacks,
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
    for (const pack of practicePacks) {
      map.set(pack.id, () => onTogglePack(pack.id));
    }
    return map;
  }, [onTogglePack, practicePacks]);

  return (
    <div className="gesture-collection-grid gesture-collection-grid--practice">
      {practicePacks.map((pack) => (
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

  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(
    () => readGesturePracticeSessionConfig()?.selectedPackIds ?? [],
  );

  const packFilesRaw = useLiveQuery(
    () =>
      selectedPackIds.length === 0
        ? Promise.resolve(GESTURE_EMPTY_PACK_FILES)
        : gestureDb.packFiles.where('packId').anyOf(selectedPackIds).toArray(),
    [selectedPackIds.join(',')],
    undefined,
  );
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  const readyPacks = useMemo(
    () => packs.filter((p) => !isIncompleteUploadPack(p, counts.get(p.id) ?? 0)),
    [counts, packs],
  );

  const allTags = useGestureKnownTags(packs);
  const tagCounts = useMemo(() => countGestureCollectionsPerTag(packs), [packs]);

  const practicePacks = useMemo(
    () =>
      readyPacks.filter(
        (p) =>
          (counts.get(p.id) ?? 0) > 0 && packMatchesGestureTagFilters(p, activeTagFilters),
      ),
    [activeTagFilters, counts, readyPacks],
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

  const togglePack = useCallback((packId: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId],
    );
  }, []);

  const toggleTagFilter = useCallback(
    (tag: string) => {
      const wasActive = activeTagFilters.includes(tag);
      const nextFilters = wasActive
        ? activeTagFilters.filter((t) => t !== tag)
        : [...activeTagFilters, tag];
      onActiveTagFiltersChange(nextFilters);

      if (!wasActive) {
        const matchingIds = readyPacks
          .filter((pack) => (counts.get(pack.id) ?? 0) > 0 && packHasGestureTag(pack, tag))
          .map((pack) => pack.id);
        if (matchingIds.length > 0) {
          setSelectedPackIds((prev) => [...new Set([...prev, ...matchingIds])]);
        }
      }
    },
    [activeTagFilters, counts, onActiveTagFiltersChange, readyPacks],
  );

  const selectAllVisible = useCallback(() => {
    setSelectedPackIds((prev) => [...new Set([...prev, ...packIdsWithPhotos])]);
  }, [packIdsWithPhotos]);

  const deselectAllVisible = useCallback(() => {
    setSelectedPackIds((prev) => prev.filter((id) => !packIdsWithPhotos.includes(id)));
  }, [packIdsWithPhotos]);

  const visibleSelectedCount = useMemo(
    () => packIdsWithPhotos.filter((id) => selectedSet.has(id)).length,
    [packIdsWithPhotos, selectedSet],
  );

  const selectionHint =
    packIdsWithPhotos.length > 0
      ? `${visibleSelectedCount} of ${packIdsWithPhotos.length} selected`
      : null;

  const collectionsReady = packsHydrated && statsHydrated;

  if (!collectionsReady) {
    return (
      <div className="gesture-tab-panel">
        <GestureTabLoading />
      </div>
    );
  }

  if (packIdsWithPhotos.length === 0 && activeTagFilters.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">Add a collection first</Typography>
          <Typography className="gesture-empty-copy">
            Practice pulls photos from your collections. Upload or link a folder to begin.
          </Typography>
          <Button variant="contained" onClick={onNeedCollections}>
            Go to collections
          </Button>
        </div>
      </div>
    );
  }

  if (packIdsWithPhotos.length === 0) {
    return (
      <div className="gesture-tab-panel">
        <GestureTagFilterBar
          tags={allTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={() => onActiveTagFiltersChange([])}
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
      selectedPackIds={selectedPackIds}
      activeTagFilters={activeTagFilters}
      packFiles={packFiles}
      drawHistory={drawHistory}
      onStart={onStart}
    >
      <div className="gesture-tab-panel gesture-practice-panel">
        <PracticeSessionControls />

        <GestureTagFilterBar
          tags={allTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={() => onActiveTagFiltersChange([])}
          selectionHint={selectionHint}
          onSelectAllShown={packIdsWithPhotos.length > 0 ? selectAllVisible : undefined}
          onDeselectAllShown={packIdsWithPhotos.length > 0 ? deselectAllVisible : undefined}
        />

        <Typography component="h2" className="gesture-practice-label">
          Collections
        </Typography>
        <PracticeCollectionGrid
          practicePacks={practicePacks}
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
