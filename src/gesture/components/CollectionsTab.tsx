import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import AddCollectionActions from '../components/AddCollectionActions';
import BulkAddTagsDialog from '../components/BulkAddTagsDialog';
import BulkSetSourceDialog from '../components/BulkSetSourceDialog';
import CollectionsBulkBar from '../components/CollectionsBulkBar';
import CollectionsCollectionGrid from '../components/CollectionsCollectionGrid';
import CollectionDropZone from '../components/CollectionDropZone';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import InterruptedMergeBanner from '../components/InterruptedMergeBanner';
import InterruptedBatchUploadBanner from '../components/InterruptedBatchUploadBanner';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import RecoveryBannerGroup from '../components/RecoveryBannerGroup';
import MergeCollectionsDialog from '../components/MergeCollectionsDialog';
import { useGestureDriveBackupContext } from '../context/GestureDriveBackupContext';
import { canMergeGesturePacks, isPackInvolvedInIncompleteMerge } from '../drive/gestureMergeCollections';
import { shouldShowMergeRecoveryBanner } from '../drive/gestureMergeActivity';
import { refreshPackFolder } from '../drive/linkPackFolder';
import {
  collectGestureTagsForFilterBar,
  countGestureCollectionsPerTagForFilterBar,
  countNsfwTaggedCollections,
  packMatchesGestureTagFilters,
} from '../drive/gesturePackTags';
import { useCollectionGridSelection } from '../hooks/useCollectionGridSelection';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import { useGestureNsfwVisibility } from '../hooks/useGestureNsfwVisibility';
import { shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
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

  const { withBlockingJob } = useLabsBlockingJobs();
  const { flushDriveWrite } = useGestureDriveBackupContext();
  const [refreshingPackIds, setRefreshingPackIds] = useState<ReadonlySet<string>>(() => new Set());
  const [deleteTargets, setDeleteTargets] = useState<GesturePack[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<GesturePack[]>([]);
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
  const [bulkSourceOpen, setBulkSourceOpen] = useState(false);
  const upload = useGestureCollectionUpload({ onComplete: onMessage, onError });
  const { dragActive, handlers } = useGestureCollectionDrop({
    upload,
  });

  const uploadSessionActive = upload.busy || upload.queuedCount > 0;
  /** Block only same-pack recovery actions while the upload queue is draining. */
  const recoveryActionsDisabled = upload.busy;

  const { packs, packsHydrated } = useGesturePacks();
  const filesByPack = useGesturePackStats();
  const { showNsfwCollections, setShowNsfwCollections } = useGestureNsfwVisibility();

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
  const nsfwTaggedCount = useMemo(() => countNsfwTaggedCollections(packs), [packs]);
  const tagCounts = useMemo(
    () => countGestureCollectionsPerTagForFilterBar(packs),
    [packs],
  );
  const filterBarTags = useMemo(
    () => collectGestureTagsForFilterBar(packs),
    [packs],
  );
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
      setRefreshingPackIds((prev) => new Set(prev).add(pack.id));
      try {
        await withBlockingJob(`Refreshing “${pack.name}”…`, async (setProgress) => {
          const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
          const result = await refreshPackFolder(token, pack.id, { onProgress: setProgress });
          await flushDriveWrite({ silent: true });
          const parts = [
            ...result.driveMergeMessages,
            `Refreshed (${result.photoCount} photo${result.photoCount === 1 ? '' : 's'}).`,
          ];
          onMessage(parts.join(' '));
          if (result.driveMergeErrors.length > 0) {
            onError(result.driveMergeErrors.join(' '));
          }
        });
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Refresh failed.');
      } finally {
        setRefreshingPackIds((prev) => {
          const next = new Set(prev);
          next.delete(pack.id);
          return next;
        });
      }
    },
    [flushDriveWrite, onError, onMessage, withBlockingJob],
  );

  const handleBulkRefresh = useCallback(async () => {
    if (selectedPacks.length === 0) return;
    onError(null);
    onMessage(null);
    try {
      await withBlockingJob(
        `Refreshing ${selectedPacks.length} collection${selectedPacks.length === 1 ? '' : 's'}…`,
        async (setProgress) => {
          const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
          let totalPhotos = 0;
          const mergeMessages: string[] = [];
          const mergeErrors: string[] = [];
          for (let index = 0; index < selectedPacks.length; index += 1) {
            const pack = selectedPacks[index]!;
            setProgress((index + 0.05) / selectedPacks.length);
            setRefreshingPackIds((prev) => new Set(prev).add(pack.id));
            try {
              const result = await refreshPackFolder(token, pack.id, {
                onProgress: (packFraction) => {
                  if (packFraction == null) {
                    setProgress(null);
                    return;
                  }
                  setProgress((index + packFraction * 0.95) / selectedPacks.length);
                },
              });
              totalPhotos += result.photoCount;
              mergeMessages.push(...result.driveMergeMessages);
              mergeErrors.push(...result.driveMergeErrors);
            } finally {
              setRefreshingPackIds((prev) => {
                const next = new Set(prev);
                next.delete(pack.id);
                return next;
              });
            }
            setProgress((index + 1) / selectedPacks.length);
          }
          await flushDriveWrite({ silent: true });
          clear();
          const parts = [
            ...mergeMessages,
            `Refreshed ${selectedPacks.length} collection${selectedPacks.length === 1 ? '' : 's'} (${totalPhotos} photo${totalPhotos === 1 ? '' : 's'}).`,
          ];
          onMessage(parts.join(' '));
          if (mergeErrors.length > 0) {
            onError(mergeErrors.join(' '));
          }
        },
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Refresh failed.');
    }
  }, [clear, flushDriveWrite, onError, onMessage, selectedPacks, withBlockingJob]);

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
      {upload.pendingBatchSession && upload.pendingBatchSession.pendingCount > 0 && !uploadSessionActive ? (
        <InterruptedBatchUploadBanner
          session={upload.pendingBatchSession}
          disabled={recoveryActionsDisabled}
          upload={upload}
          onDismiss={() => void upload.refreshPendingBatchSession()}
          onError={onError}
        />
      ) : null}
      {/* One banner each buried the toolbar when several uploads were
          interrupted; the group summarises past a single item. */}
      <RecoveryBannerGroup
        banners={[
          ...recoveryPacks.map((pack) => (
            <InterruptedUploadBanner
              key={pack.id}
              pack={pack}
              photoCount={filesByPack.counts.get(pack.id) ?? 0}
              disabled={recoveryActionsDisabled}
              upload={upload}
              onMessage={onMessage}
              onError={onError}
              onRemove={(target) => openDeleteDialog([target])}
            />
          )),
          ...mergeRecoveryPacks.map((pack) => (
            <InterruptedMergeBanner
              key={`merge-${pack.id}`}
              pack={pack}
              onMessage={onMessage}
              onError={onError}
              onRemove={(target) => openDeleteDialog([target])}
            />
          )),
        ]}
      />
      <div className="gesture-tab-toolbar">
        <Typography className="gesture-tab-lede">
          Sign in with Google to upload or link a collection. Photos live in your Drive; tags and
          source links save on this device and sync when you are signed in.
        </Typography>
        <div className="gesture-tab-toolbar-actions">
          <AddCollectionActions
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
          slotProps={{
            htmlInput: { 'aria-label': 'Search collections by name' }
          }}
        />

        <GestureTagFilterBar
          tags={filterBarTags}
          tagCounts={tagCounts}
          activeTags={activeTagFilters}
          onToggleTag={toggleTagFilter}
          onClear={() => onActiveTagFiltersChange([])}
          nsfwTaggedCount={nsfwTaggedCount}
          showNsfwCollections={showNsfwCollections}
          onShowNsfwCollectionsChange={setShowNsfwCollections}
        />
      </div>
      {!packsHydrated ? (
        <GestureTabLoading />
      ) : packs.length === 0 ? (
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections yet</Typography>
          <Typography className="gesture-empty-copy">
            Sign in with Google, then drag a folder here or use Add. New collections require Google
            Drive; tags and source links still save on this device once you have collections.
          </Typography>
          <AddCollectionActions upload={upload} onComplete={onMessage} onError={onError} />
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
          stats={filesByPack}
          allTags={allTags}
          upload={upload}
          selectedSet={selectedSet}
          interactionDisabled={false}
          refreshingPackIds={refreshingPackIds}
          previewFetchEnabled={previewFetchEnabled}
          showNsfwCollections={showNsfwCollections}
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
        busy={uploadSessionActive}
        onClose={closeMergeDialog}
        onComplete={handleMergeComplete}
        onError={onError}
      />
      <BulkAddTagsDialog
        open={bulkTagsOpen}
        packCount={selectedPacks.length}
        allTags={allTags}
        busy={false}
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
        busy={false}
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
            busy={false}
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
