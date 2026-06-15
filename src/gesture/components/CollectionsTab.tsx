import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import AddCollectionActions from '../components/AddCollectionActions';
import CollectionDropZone from '../components/CollectionDropZone';
import CollectionUploadStatus from '../components/CollectionUploadStatus';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import GestureTabLoading from '../components/GestureTabLoading';
import GestureTagFilterBar from '../components/GestureTagFilterBar';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import PackCollectionCard from '../components/PackCollectionCard';
import { refreshPackFolder } from '../drive/linkPackFolder';
import { packMatchesGestureTagFilters } from '../drive/gesturePackTags';
import { useGestureKnownTags } from '../hooks/useGestureKnownTags';
import { shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
import { useGestureCollectionDrop } from '../hooks/useGestureCollectionDrop';
import { useGestureCollectionUpload } from '../hooks/useGestureCollectionUpload';
import { useGesturePackStats, resolveGesturePackCoverFileIds } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
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
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GesturePack | null>(null);
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

  const visiblePacks = useMemo(
    () => packs.filter((pack) => packMatchesGestureTagFilters(pack, activeTagFilters)),
    [activeTagFilters, packs],
  );

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
        <AddCollectionActions
          disabled={interactionDisabled}
          variant="subtle"
          upload={upload}
          onComplete={onMessage}
          onError={onError}
        />
      </div>

      <CollectionDropZone compact={packsHydrated && packs.length > 0} dragActive={dragActive} uploadActive={uploadSessionActive} />

      <GestureTagFilterBar
        tags={allTags}
        activeTags={activeTagFilters}
        onToggleTag={toggleTagFilter}
        onClear={() => onActiveTagFiltersChange([])}
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
          <Typography className="gesture-empty-title">No collections match these tags</Typography>
          <Typography className="gesture-empty-copy">
            Clear the tag filters or add tags on a collection card.
          </Typography>
        </div>
      ) : (
        <div className="gesture-collection-grid">
          {visiblePacks.map((pack) => {
            const photoCount = statsForGrid.counts.get(pack.id) ?? 0;
            const fileIds = resolveGesturePackCoverFileIds(pack, statsForGrid.coverIds);
            return (
              <PackCollectionCard
                key={pack.id}
                pack={pack}
                driveFileIds={fileIds}
                photoCount={photoCount}
                drawnCount={statsForGrid.drawnSets.get(pack.id)?.size ?? 0}
                mode="manage"
                disabled={interactionDisabled}
                allTags={allTags}
                upload={upload}
                dropEnabled
                onRefresh={() => void handleRefresh(pack)}
                onDelete={() => openDeleteDialog(pack)}
                onRenamed={(updated) => onMessage(`Renamed to "${updated.name}".`)}
                onUpdated={() => onMessage(null)}
                onError={(msg) => {
                  onError(msg);
                }}
                previewFetchEnabled={previewFetchEnabled}
              />
            );
          })}
        </div>
      )}

      <DeleteCollectionDialog
        pack={deleteTarget}
        open={deleteTarget != null}
        busy={busy || uploadSessionActive}
        onClose={() => setDeleteTarget(null)}
        onComplete={onMessage}
        onError={onError}
      />
    </div>
  );
}
