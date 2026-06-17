import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import AddCollectionActions from '../components/AddCollectionActions';
import BulkAddTagsDialog from '../components/BulkAddTagsDialog';
import BulkSetSourceDialog from '../components/BulkSetSourceDialog';
import CollectionsBulkBar from '../components/CollectionsBulkBar';
import CollectionsCollectionGrid from '../components/CollectionsCollectionGrid';
import CollectionDropZone from '../components/CollectionDropZone';
import CollectionUploadStatus from '../components/CollectionUploadStatus';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import InterruptedMergeBanner from '../components/InterruptedMergeBanner';
import InterruptedBatchUploadBanner from '../components/InterruptedBatchUploadBanner';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import MergeCollectionsDialog from '../components/MergeCollectionsDialog';
import { canMergeGesturePacks, isPackInvolvedInIncompleteMerge } from '../drive/gestureMergeCollections';
import { shouldShowMergeRecoveryBanner } from '../drive/gestureMergeActivity';
import { refreshPackFolder } from '../drive/linkPackFolder';
import { packMatchesGestureTagFilters, countGestureCollectionsPerTag } from '../drive/gesturePackTags';
import { useCollectionGridSelection } from '../hooks/useCollectionGridSelection';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import { buildUploadActivity, shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
import { useGestureCollectionDrop } from '../hooks/useGestureCollectionDrop';
import { useGestureCollectionUpload } from '../hooks/useGestureCollectionUpload';
import { useGestureMergeResume } from '../hooks/useGestureMergeResume';
import { useGesturePackStats } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
import { mountGestureCollectionsScrollPerf } from '../perf/gestureCollectionsScrollPerf';
import type { GesturePack } from '../types';

interface CollectionsTabProps {
  activeTagFilters: string[];
  onActiveTagFiltersChange: (tags: string[]) => void;
  onMessage: (message: string | null) => void;
  onError: (message: string | null) => void;
  previewFetchEnabled?: boolean;
}

export default function CollectionsTab({
  activeTagFilters,
  onActiveTagFiltersChange,
  onMessage,
  onError,
  previewFetchEnabled = true,
}: CollectionsTabProps): React.ReactElement {
  useEffect(() => mountGestureCollectionsScrollPerf(), []);
  useGestureMergeResume(true, onMessage, onError);

  const [busy, setBusy] = useState(false);
  const [bulkProgressLabel, setBulkProgressLabel] = useState<string | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<GesturePack[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<GesturePack[]>([]);
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
  const [bulkSourceOpen, setBulkSourceOpen] = useState(false);
  const upload = useGestureCollectionUpload({ onComplete: onMessage, onError });
  const { dragActive, handlers, activity } = useGestureCollectionDrop({
    disabled: busy,
    upload,
  });

  const interactionDisabled = busy;
  const uploadSessionActive = upload.busy || upload.queuedCount > 0;
  const uploadActivity =
    activity ?? (uploadSessionActive ? buildUploadActivity('preparing') : null);

  const { packs, packsHydrated } = useGesturePacks();
  const filesByPack = useGesturePackStats();
  const deferredFilesByPack = useDeferredValue(filesByPack);
  const statsForGrid = uploadSessionActive ? deferredFilesByPack : filesByPack;

  const incompleteMergeParents = useMemo(
    () => packs.filter((pack) => pack.mergeStatus === 'incomplete'),
    [packs],
  );

  const mergeRecoveryPacks = useMemo(
    () => packs.filter((pack) => shouldShowMergeRecoveryBanner(pack)),
    [packs],
  );

  const recoveryPacks = useMemo(
    () =>
      packs.filter((pack) =>
        shouldShowUploadRecoveryBanner(
          pack,
          uploadSessionActive,
          filesByPack.counts.get(pack.id) ?? 0,
        ),
      ),
    [filesByPack.counts, packs, uploadSessionActive],
  );

  const allTags = useGestureKnownTags(packs);
  const tagCounts = useMemo(() => countGestureCollectionsPerTag(packs), [packs]);
  const deferredNameQuery = useDeferredValue(nameQuery.trim().toLowerCase());

  const visiblePacks = useMemo(() => {
    return packs.filter((pack) => {
      if (!packMatchesGestureTagFilters(pack, activeTagFilters)) return false;
      if (!deferredNameQuery) return true;
      return pack.name.toLowerCase().includes(deferredNameQuery);
    });
  }, [activeTagFilters, deferredNameQuery, packs]);

  const visiblePackIds = useMemo(() => visiblePacks.map((pack) => pack.id), [visiblePacks]);

  const selection = useCollectionGridSelection(visiblePackIds);
  const { selectedIds, selectedSet, selectionActive, toggle, clear, selectAllShown } =
    selection;

  const selectedPacks = useMemo(
    () => packs.filter((pack) => selectedSet.has(pack.id)),
    [packs, selectedSet],
  );

  const mergeEnabled =
    selectedPacks.length >= 2 &&
    canMergeGesturePacks(selectedPacks) &&
    !selectedPacks.some((pack) => isPackInvolvedInIncompleteMerge(pack, incompleteMergeParents));

  const mergeHint =
    selectedPacks.length >= 2 && !mergeEnabled
      ? selectedPacks.some((pack) => isPackInvolvedInIncompleteMerge(pack, incompleteMergeParents))
        ? 'Finish or remove the interrupted merge first'
        : 'Cannot merge while an upload is in progress'
      : selectedPacks.length < 2
        ? 'Select at least 2 collections to merge'
        : null;

  const refreshEnabled = selectedPacks.every((pack) => pack.uploadStatus !== 'uploading');

  const toggleTagFilter = useCallback(
    (tag: string) => {
      onActiveTagFiltersChange(
        activeTagFilters.includes(tag)
          ? activeTagFilters.filter((t) => t !== tag)
          : [...activeTagFilters, tag],
      );
    },
    [activeTagFilters, onActiveTagFiltersChange],
  );

  const handleRefresh = useCallback(
    async (pack: GesturePack) => {
      onError(null);
      onMessage(null);
      setBusy(true);
      try {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const result = await refreshPackFolder(token, pack.id);
        const parts = [
          ...result.driveMergeMessages,
          `Refreshed (${result.photoCount} photo${result.photoCount === 1 ? '' : 's'}).`,
        ];
        onMessage(parts.join(' '));
        if (result.driveMergeErrors.length > 0) {
          onError(result.driveMergeErrors.join(' '));
        }
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Refresh failed.');
      } finally {
        setBusy(false);
      }
    },
    [onError, onMessage],
  );

  const handleBulkRefresh = useCallback(async () => {
    if (selectedPacks.length === 0) return;
    onError(null);
    onMessage(null);
    setBusy(true);
    setBulkProgressLabel(null);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      let totalPhotos = 0;
      const mergeMessages: string[] = [];
      const mergeErrors: string[] = [];
      for (let index = 0; index < selectedPacks.length; index += 1) {
        const pack = selectedPacks[index];
        setBulkProgressLabel(`Refreshing ${index + 1} of ${selectedPacks.length}…`);
        const result = await refreshPackFolder(token, pack.id);
        totalPhotos += result.photoCount;
        mergeMessages.push(...result.driveMergeMessages);
        mergeErrors.push(...result.driveMergeErrors);
      }
      clear();
      const parts = [
        ...mergeMessages,
        `Refreshed ${selectedPacks.length} collection${selectedPacks.length === 1 ? '' : 's'} (${totalPhotos} photo${totalPhotos === 1 ? '' : 's'}).`,
      ];
      onMessage(parts.join(' '));
      if (mergeErrors.length > 0) {
        onError(mergeErrors.join(' '));
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Refresh failed.');
    } finally {
      setBusy(false);
      setBulkProgressLabel(null);
    }
  }, [clear, onError, onMessage, selectedPacks]);

  const openDeleteDialog = useCallback((targets: GesturePack[]) => {
    setDeleteTargets(targets);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteComplete = useCallback(
    (message: string) => {
      clear();
      onMessage(message);
    },
    [clear, onMessage],
  );

  const handleMergeComplete = useCallback(
    (message: string) => {
      clear();
      setMergeDialogOpen(false);
      setMergeTargets([]);
      onMessage(message);
    },
    [clear, onMessage],
  );

  const closeMergeDialog = useCallback(() => {
    setMergeDialogOpen(false);
    setMergeTargets([]);
  }, []);

  return (
    <div
      className={`gesture-tab-panel${dragActive ? ' is-drag-active' : ''}${uploadSessionActive ? ' is-upload-busy' : ''}${selectionActive ? ' has-collections-bulk-dock' : ''}`}
      aria-label="Drop folders or photos to upload"
      {...handlers}
    >
      {uploadActivity ? <CollectionUploadStatus activity={uploadActivity} /> : null}

      {upload.pendingBatchSession && upload.pendingBatchSession.pendingCount > 0 && !uploadSessionActive ? (
        <InterruptedBatchUploadBanner
          session={upload.pendingBatchSession}
          disabled={interactionDisabled}
          upload={upload}
          onDismiss={() => void upload.refreshPendingBatchSession()}
          onError={onError}
        />
      ) : null}

      {recoveryPacks.map((pack) => (
        <InterruptedUploadBanner
          key={pack.id}
          pack={pack}
          photoCount={filesByPack.counts.get(pack.id) ?? 0}
          disabled={interactionDisabled}
          upload={upload}
          onMessage={onMessage}
          onError={onError}
          onRemove={(target) => openDeleteDialog([target])}
        />
      ))}

      {mergeRecoveryPacks.map((pack) => (
        <InterruptedMergeBanner
          key={`merge-${pack.id}`}
          pack={pack}
          disabled={interactionDisabled}
          onMessage={onMessage}
          onError={onError}
          onRemove={(target) => openDeleteDialog([target])}
        />
      ))}

      <div className="gesture-tab-toolbar">
        <Typography className="gesture-tab-lede">
          Upload folders or photos, or link a Drive folder. Drop on a card to add photos to that collection.
        </Typography>
        <div className="gesture-tab-toolbar-actions">
          <AddCollectionActions
            disabled={interactionDisabled}
            variant="subtle"
            upload={upload}
            onComplete={onMessage}
            onError={onError}
          />
        </div>
      </div>

      <CollectionDropZone compact={packsHydrated && packs.length > 0} dragActive={dragActive} uploadActive={uploadSessionActive} />

      <div className="gesture-collections-sticky-head">
        <TextField
          className="gesture-collections-search"
          size="small"
          fullWidth
          placeholder="Search collections"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          disabled={!packsHydrated || packs.length === 0}
          inputProps={{ 'aria-label': 'Search collections by name' }}
        />

        <GestureTagFilterBar
          tags={allTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={() => onActiveTagFiltersChange([])}
        />
      </div>

      {!packsHydrated ? (
        <GestureTabLoading />
      ) : packs.length === 0 ? (
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections yet</Typography>
          <Typography className="gesture-empty-copy">
            Drag a folder here, or use Add to pick files. Everything saves to your Drive automatically.
          </Typography>
          <AddCollectionActions disabled={busy} upload={upload} onComplete={onMessage} onError={onError} />
        </div>
      ) : visiblePacks.length === 0 ? (
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections match</Typography>
          <Typography className="gesture-empty-copy">
            Try a different search or clear tag filters.
          </Typography>
        </div>
      ) : (
        <CollectionsCollectionGrid
          visiblePacks={visiblePacks}
          stats={statsForGrid}
          allTags={allTags}
          upload={upload}
          selectedSet={selectedSet}
          interactionDisabled={interactionDisabled}
          previewFetchEnabled={previewFetchEnabled}
          onToggleCollectionSelect={toggle}
          onRefresh={handleRefresh}
          onDelete={(pack) => openDeleteDialog([pack])}
          onRenamed={(updated) => onMessage(`Renamed to "${updated.name}".`)}
          onUpdated={() => onMessage(null)}
          onError={onError}
        />
      )}

      <DeleteCollectionDialog
        packs={deleteTargets}
        open={deleteDialogOpen}
        busy={busy}
        onCancelUpload={upload.cancelUploadForPack}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTargets([]);
        }}
        onComplete={handleDeleteComplete}
        onError={onError}
      />

      <MergeCollectionsDialog
        open={mergeDialogOpen && mergeTargets.length >= 2}
        packs={mergeTargets}
        busy={busy || uploadSessionActive}
        onClose={closeMergeDialog}
        onComplete={handleMergeComplete}
        onError={onError}
      />

      <BulkAddTagsDialog
        open={bulkTagsOpen}
        packCount={selectedPacks.length}
        allTags={allTags}
        busy={interactionDisabled}
        packIds={selectedIds}
        onClose={() => setBulkTagsOpen(false)}
        onComplete={(msg) => {
          clear();
          onMessage(msg);
        }}
        onError={onError}
      />

      <BulkSetSourceDialog
        open={bulkSourceOpen}
        packCount={selectedPacks.length}
        busy={interactionDisabled}
        packIds={selectedIds}
        onClose={() => setBulkSourceOpen(false)}
        onComplete={(msg) => {
          clear();
          onMessage(msg);
        }}
        onError={onError}
      />

      {selectionActive ? (
        <div className="gesture-collections-bulk-dock">
          <CollectionsBulkBar
            selectedCount={selectedIds.length}
            visibleCount={visiblePacks.length}
            busy={interactionDisabled}
            progressLabel={bulkProgressLabel}
            mergeEnabled={mergeEnabled}
            mergeHint={mergeHint}
            refreshEnabled={refreshEnabled}
            onSelectAll={selectAllShown}
            onClearSelection={clear}
            onMerge={() => {
              setMergeTargets(selectedPacks);
              setMergeDialogOpen(true);
            }}
            onAddTags={() => setBulkTagsOpen(true)}
            onSetSource={() => setBulkSourceOpen(true)}
            onRefresh={() => void handleBulkRefresh()}
            onDelete={() => openDeleteDialog(selectedPacks)}
          />
        </div>
      ) : null}
    </div>
  );
}
