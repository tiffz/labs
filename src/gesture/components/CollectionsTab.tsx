import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import AddCollectionActions from '../components/AddCollectionActions';
import CollectionsCollectionGrid from '../components/CollectionsCollectionGrid';
import CollectionDropZone from '../components/CollectionDropZone';
import CollectionUploadStatus from '../components/CollectionUploadStatus';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import MergeCollectionsDialog from '../components/MergeCollectionsDialog';
import { canMergeGesturePacks } from '../drive/gestureMergeCollections';
import { refreshPackFolder } from '../drive/linkPackFolder';
import { packMatchesGestureTagFilters } from '../drive/gesturePackTags';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import { shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
import { useGestureCollectionDrop } from '../hooks/useGestureCollectionDrop';
import { useGestureCollectionUpload } from '../hooks/useGestureCollectionUpload';
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

  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GesturePack | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const upload = useGestureCollectionUpload({ onComplete: onMessage, onError });
  const { dragActive, handlers, activity } = useGestureCollectionDrop({
    disabled: busy,
    upload,
  });

  const interactionDisabled = busy;
  const uploadSessionActive = upload.busy || upload.queuedCount > 0;

  const { packs, packsHydrated } = useGesturePacks();
  const filesByPack = useGesturePackStats();
  const deferredFilesByPack = useDeferredValue(filesByPack);
  const statsForGrid = uploadSessionActive ? deferredFilesByPack : filesByPack;

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
  const deferredNameQuery = useDeferredValue(nameQuery.trim().toLowerCase());

  const visiblePacks = useMemo(() => {
    return packs.filter((pack) => {
      if (!packMatchesGestureTagFilters(pack, activeTagFilters)) return false;
      if (!deferredNameQuery) return true;
      return pack.name.toLowerCase().includes(deferredNameQuery);
    });
  }, [activeTagFilters, deferredNameQuery, packs]);

  const mergePacks = useMemo((): [GesturePack, GesturePack] | null => {
    if (mergeSelection.length !== 2) return null;
    const a = packs.find((p) => p.id === mergeSelection[0]);
    const b = packs.find((p) => p.id === mergeSelection[1]);
    if (!a || !b) return null;
    return [a, b];
  }, [mergeSelection, packs]);

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

  const toggleMergeSelect = useCallback((packId: string) => {
    setMergeSelection((prev) => {
      if (prev.includes(packId)) return prev.filter((id) => id !== packId);
      if (prev.length >= 2) return [prev[1], packId];
      return [...prev, packId];
    });
  }, []);

  const handleRefresh = useCallback(
    async (pack: GesturePack) => {
      onError(null);
      onMessage(null);
      setBusy(true);
      try {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const count = await refreshPackFolder(token, pack.id);
        onMessage(`Refreshed (${count} photo${count === 1 ? '' : 's'}).`);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Refresh failed.');
      } finally {
        setBusy(false);
      }
    },
    [onError, onMessage],
  );

  const openDeleteDialog = useCallback((pack: GesturePack) => {
    setDeleteTarget(pack);
  }, []);

  const exitMergeMode = useCallback(() => {
    setMergeMode(false);
    setMergeSelection([]);
  }, []);

  const mergeSelectionHint = mergeMode
    ? mergeSelection.length === 2
      ? '2 collections selected'
      : mergeSelection.length === 1
        ? '1 selected · pick one more'
        : 'Pick two collections to merge'
    : null;

  const canOpenMerge =
    mergePacks != null && canMergeGesturePacks(mergePacks[0], mergePacks[1]);

  return (
    <div
      className={`gesture-tab-panel${dragActive ? ' is-drag-active' : ''}${uploadSessionActive ? ' is-upload-busy' : ''}`}
      aria-label="Drop folders or photos to upload"
      {...handlers}
    >
      {activity ? <CollectionUploadStatus activity={activity} /> : null}

      {recoveryPacks.map((pack) => (
        <InterruptedUploadBanner
          key={pack.id}
          pack={pack}
          photoCount={filesByPack.counts.get(pack.id) ?? 0}
          disabled={interactionDisabled}
          upload={upload}
          onMessage={onMessage}
          onError={onError}
          onRemove={openDeleteDialog}
        />
      ))}

      <div className="gesture-tab-toolbar">
        <Typography className="gesture-tab-lede">
          Upload folders or photos, or link a Drive folder. Drop several folders at once for separate collections. Drop on a card to add photos to that collection.
        </Typography>
        <div className="gesture-tab-toolbar-actions">
          <AddCollectionActions
            disabled={interactionDisabled}
            variant="subtle"
            upload={upload}
            onComplete={onMessage}
            onError={onError}
          />
          {!mergeMode && packsHydrated && packs.length >= 2 ? (
            <Button
              size="small"
              variant="text"
              className="gesture-merge-entry-btn"
              disabled={interactionDisabled}
              onClick={() => setMergeMode(true)}
            >
              Merge collections…
            </Button>
          ) : null}
        </div>
      </div>

      <CollectionDropZone compact={packsHydrated && packs.length > 0} dragActive={dragActive} uploadActive={uploadSessionActive} />

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
        activeTags={activeTagFilters}
        onToggleTag={toggleTagFilter}
        onClear={() => onActiveTagFiltersChange([])}
        selectionHint={mergeSelectionHint}
        selectionPrimaryAction={
          mergeMode && mergeSelection.length === 2
            ? {
                label: 'Merge into one…',
                disabled: !canOpenMerge || interactionDisabled,
                onClick: () => setMergeDialogOpen(true),
              }
            : undefined
        }
        onClearSelection={mergeMode ? exitMergeMode : undefined}
      />

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
          mergeMode={mergeMode}
          mergeSelection={mergeSelection}
          interactionDisabled={interactionDisabled}
          previewFetchEnabled={previewFetchEnabled}
          onToggleMergeSelect={toggleMergeSelect}
          onRefresh={handleRefresh}
          onDelete={openDeleteDialog}
          onRenamed={(updated) => onMessage(`Renamed to "${updated.name}".`)}
          onUpdated={() => onMessage(null)}
          onError={onError}
        />
      )}

      <DeleteCollectionDialog
        pack={deleteTarget}
        open={deleteTarget != null}
        busy={busy}
        onCancelUpload={upload.cancelUploadForPack}
        onClose={() => setDeleteTarget(null)}
        onComplete={onMessage}
        onError={onError}
      />

      {mergePacks ? (
        <MergeCollectionsDialog
          open={mergeDialogOpen}
          packs={mergePacks}
          busy={busy || uploadSessionActive}
          onClose={() => setMergeDialogOpen(false)}
          onComplete={(msg) => {
            exitMergeMode();
            onMessage(msg);
          }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}
