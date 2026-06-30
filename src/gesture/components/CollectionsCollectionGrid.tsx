import { memo, useMemo } from 'react';
import PackCollectionCard from './PackCollectionCard';
import type { GestureCollectionUploadHandle } from '../hooks/useGestureCollectionUpload';
import { resolveGesturePackCoverFileIds } from '../hooks/useGesturePackStats';
import { packShouldBlurNsfwPreviews } from '../drive/gesturePackTags';
import type { GesturePack } from '../types';
import type { GesturePackStats } from '../hooks/useGesturePackStatsTypes';

type CollectionsCollectionGridProps = {
  visiblePacks: GesturePack[];
  stats: GesturePackStats;
  allTags: string[];
  upload: GestureCollectionUploadHandle;
  selectedSet: Set<string>;
  interactionDisabled: boolean;
  refreshingPackIds: ReadonlySet<string>;
  previewFetchEnabled: boolean;
  showNsfwCollections: boolean;
  onToggleCollectionSelect: (packId: string) => void;
  onRefresh: (pack: GesturePack) => void;
  onDelete: (pack: GesturePack) => void;
  onRenamed: (pack: GesturePack) => void;
  onUpdated: () => void;
  onError: (message: string) => void;
};

function CollectionGridCard({
  pack,
  stats,
  allTags,
  upload,
  collectionSelected,
  interactionDisabled,
  refreshing,
  previewFetchEnabled,
  showNsfwCollections,
  onToggleCollectionSelect,
  onRefresh,
  onDelete,
  onRenamed,
  onUpdated,
  onError,
}: {
  pack: GesturePack;
  stats: GesturePackStats;
  allTags: string[];
  upload: GestureCollectionUploadHandle;
  collectionSelected: boolean;
  interactionDisabled: boolean;
  refreshing: boolean;
  previewFetchEnabled: boolean;
  showNsfwCollections: boolean;
  onToggleCollectionSelect?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  onRenamed: (pack: GesturePack) => void;
  onUpdated: () => void;
  onError: (message: string) => void;
}): React.ReactElement {
  const photoCount = stats.counts.get(pack.id) ?? 0;
  const fileIds = resolveGesturePackCoverFileIds(pack, stats.coverIds);
  return (
    <PackCollectionCard
      pack={pack}
      driveFileIds={fileIds}
      photoCount={photoCount}
      drawnCount={stats.drawnSets.get(pack.id)?.size ?? 0}
      mode="manage"
      disabled={interactionDisabled}
      allTags={allTags}
      upload={upload}
      dropEnabled
      compactManage
      collectionSelectable
      collectionSelected={collectionSelected}
      onToggleCollectionSelect={onToggleCollectionSelect}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onDelete={onDelete}
      onRenamed={onRenamed}
      onUpdated={onUpdated}
      onError={onError}
      previewFetchEnabled={previewFetchEnabled}
      blurNsfwPreviews={packShouldBlurNsfwPreviews(pack, showNsfwCollections)}
    />
  );
}

const CollectionsCollectionGrid = memo(function CollectionsCollectionGrid({
  visiblePacks,
  stats,
  allTags,
  upload,
  selectedSet,
  interactionDisabled,
  refreshingPackIds,
  previewFetchEnabled,
  showNsfwCollections,
  onToggleCollectionSelect,
  onRefresh,
  onDelete,
  onRenamed,
  onUpdated,
  onError,
}: CollectionsCollectionGridProps): React.ReactElement {
  const toggleHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const pack of visiblePacks) {
      map.set(pack.id, () => onToggleCollectionSelect(pack.id));
    }
    return map;
  }, [onToggleCollectionSelect, visiblePacks]);

  const refreshHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const pack of visiblePacks) {
      map.set(pack.id, () => onRefresh(pack));
    }
    return map;
  }, [onRefresh, visiblePacks]);

  const deleteHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const pack of visiblePacks) {
      map.set(pack.id, () => onDelete(pack));
    }
    return map;
  }, [onDelete, visiblePacks]);

  return (
    <div className="gesture-collection-grid gesture-collection-grid--compact">
      {visiblePacks.map((pack) => (
        <CollectionGridCard
          key={pack.id}
          pack={pack}
          stats={stats}
          allTags={allTags}
          upload={upload}
          collectionSelected={selectedSet.has(pack.id)}
          interactionDisabled={interactionDisabled}
          refreshing={refreshingPackIds.has(pack.id)}
          previewFetchEnabled={previewFetchEnabled}
          showNsfwCollections={showNsfwCollections}
          onToggleCollectionSelect={toggleHandlers.get(pack.id)}
          onRefresh={refreshHandlers.get(pack.id)}
          onDelete={deleteHandlers.get(pack.id)}
          onRenamed={onRenamed}
          onUpdated={onUpdated}
          onError={onError}
        />
      ))}
    </div>
  );
});

export default CollectionsCollectionGrid;
