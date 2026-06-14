import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import AddCollectionActions from '../components/AddCollectionActions';
import CollectionDropZone from '../components/CollectionDropZone';
import CollectionUploadStatus from '../components/CollectionUploadStatus';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import PackCollectionCard from '../components/PackCollectionCard';
import { refreshPackFolder } from '../drive/linkPackFolder';
import { shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
import { useGestureCollectionPreviewWarmup } from '../hooks/useGestureCollectionPreviewWarmup';
import { useGesturePackStats } from '../hooks/useGesturePackStats';
import { useGesturePacks } from '../hooks/useGesturePacks';
import { useGestureCollectionDrop } from '../hooks/useGestureCollectionDrop';
import { useGestureCollectionUpload } from '../hooks/useGestureCollectionUpload';
import type { GesturePack } from '../types';

interface CollectionsTabProps {
  onMessage: (message: string | null) => void;
  onError: (message: string | null) => void;
}

export default function CollectionsTab({ onMessage, onError }: CollectionsTabProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GesturePack | null>(null);
  const upload = useGestureCollectionUpload({ onComplete: onMessage, onError });
  const { dragActive, handlers, activity } = useGestureCollectionDrop({
    disabled: busy,
    upload,
  });

  const interactionDisabled = busy;
  const uploadSessionActive = upload.busy || upload.queuedCount > 0;

  const packs = useGesturePacks();
  const filesByPack = useGesturePackStats();
  const deferredFilesByPack = useDeferredValue(filesByPack);
  const statsForGrid = uploadSessionActive ? deferredFilesByPack : filesByPack;

  const previewSnapshotRef = useRef<string[]>([]);
  const previewFileIds = useMemo(() => {
    if (uploadSessionActive && previewSnapshotRef.current.length > 0) {
      return previewSnapshotRef.current;
    }
    const fileIds: string[] = [];
    for (const pack of packs) {
      fileIds.push(...(filesByPack.ids.get(pack.id) ?? []).slice(0, 4));
    }
    previewSnapshotRef.current = fileIds;
    return fileIds;
  }, [filesByPack.ids, packs, uploadSessionActive]);

  useGestureCollectionPreviewWarmup(uploadSessionActive ? [] : previewFileIds);

  const recoveryPacks = useMemo(
    () => packs.filter((pack) => shouldShowUploadRecoveryBanner(pack, uploadSessionActive)),
    [packs, uploadSessionActive],
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
      aria-label="Drop a folder or photos to upload"
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
          Upload a folder or photos, drop on a collection to add there, or link a Drive folder. Tap a title to rename or
          add a source link anytime.
        </Typography>
        <AddCollectionActions
          disabled={interactionDisabled}
          variant="subtle"
          upload={upload}
          onComplete={onMessage}
          onError={onError}
        />
      </div>

      <CollectionDropZone compact={packs.length > 0} dragActive={dragActive} uploadActive={uploadSessionActive} />

      {packs.length === 0 ? (
        <div className="gesture-empty-state">
          <Typography className="gesture-empty-title">No collections yet</Typography>
          <Typography className="gesture-empty-copy">
            Drag a folder here, or use Add to pick files. Everything saves to your Drive automatically.
          </Typography>
          <AddCollectionActions disabled={busy} upload={upload} onComplete={onMessage} onError={onError} />
        </div>
      ) : (
        <div className="gesture-collection-grid">
          {packs.map((pack) => {
            const photoCount = statsForGrid.counts.get(pack.id) ?? 0;
            const fileIds =
              pack.uploadStatus === 'uploading'
                ? (statsForGrid.ids.get(pack.id) ?? []).slice(0, 4)
                : (statsForGrid.ids.get(pack.id) ?? []);
            return (
              <PackCollectionCard
                key={pack.id}
                pack={pack}
                driveFileIds={fileIds}
                photoCount={photoCount}
                drawnCount={statsForGrid.drawnSets.get(pack.id)?.size ?? 0}
                mode="manage"
                disabled={interactionDisabled}
                upload={upload}
                dropEnabled
                onRefresh={() => void handleRefresh(pack)}
                onDelete={() => openDeleteDialog(pack)}
                onRenamed={(updated) => onMessage(`Renamed to "${updated.name}".`)}
                onUpdated={() => onMessage(null)}
                onError={(msg) => {
                  onError(msg);
                }}
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
