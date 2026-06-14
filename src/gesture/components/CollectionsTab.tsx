import { useCallback, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ensureLabsGoogleAccessTokenForDrive,
} from '../../shared/google/labsGoogleDriveAccess';
import AddCollectionActions from '../components/AddCollectionActions';
import CollectionDropZone from '../components/CollectionDropZone';
import CollectionUploadStatus from '../components/CollectionUploadStatus';
import DeleteCollectionDialog from '../components/DeleteCollectionDialog';
import InterruptedUploadBanner from '../components/InterruptedUploadBanner';
import PackCollectionCard from '../components/PackCollectionCard';
import { gestureDb } from '../db/gestureDb';
import { refreshPackFolder } from '../drive/linkPackFolder';
import { shouldShowUploadRecoveryBanner } from '../drive/gestureUploadActivity';
import { useGestureCollectionPreviewWarmup } from '../hooks/useGestureCollectionPreviewWarmup';
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
  const { dragActive, handlers, activity, busy: uploadBusy } = useGestureCollectionDrop({
    disabled: busy,
    upload,
  });

  const interactionDisabled = busy || uploadBusy;

  const packs = useLiveQuery(() => gestureDb.packs.orderBy('linkedAt').reverse().toArray(), []) ?? [];
  const packFiles = useLiveQuery(() => gestureDb.packFiles.toArray(), []) ?? [];
  const drawHistory = useLiveQuery(() => gestureDb.drawHistory.toArray(), []) ?? [];

  const recoveryPacks = useMemo(
    () => packs.filter((pack) => shouldShowUploadRecoveryBanner(pack, uploadBusy)),
    [packs, uploadBusy],
  );

  const filesByPack = useMemo(() => {
    const counts = new Map<string, number>();
    const ids = new Map<string, string[]>();
    const drawnSets = new Map<string, Set<string>>();
    for (const f of packFiles) {
      counts.set(f.packId, (counts.get(f.packId) ?? 0) + 1);
      const list = ids.get(f.packId) ?? [];
      list.push(f.driveFileId);
      ids.set(f.packId, list);
    }
    for (const row of drawHistory) {
      const set = drawnSets.get(row.packId) ?? new Set<string>();
      set.add(row.driveFileId);
      drawnSets.set(row.packId, set);
    }
    return { counts, ids, drawnSets };
  }, [drawHistory, packFiles]);

  const previewFileIds = useMemo(() => {
    const fileIds: string[] = [];
    for (const pack of packs) {
      fileIds.push(...(filesByPack.ids.get(pack.id) ?? []).slice(0, 4));
    }
    return fileIds;
  }, [filesByPack.ids, packs]);

  useGestureCollectionPreviewWarmup(previewFileIds);

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
      className={`gesture-tab-panel${dragActive ? ' is-drag-active' : ''}${uploadBusy ? ' is-upload-busy' : ''}`}
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

      <CollectionDropZone compact={packs.length > 0} dragActive={dragActive} uploadActive={uploadBusy} />

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
            const photoCount = filesByPack.counts.get(pack.id) ?? 0;
            const fileIds = filesByPack.ids.get(pack.id) ?? [];
            return (
              <PackCollectionCard
                key={pack.id}
                pack={pack}
                driveFileIds={fileIds}
                photoCount={photoCount}
                drawnCount={filesByPack.drawnSets.get(pack.id)?.size ?? 0}
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
        busy={busy || uploadBusy}
        onClose={() => setDeleteTarget(null)}
        onComplete={onMessage}
        onError={onError}
      />
    </div>
  );
}
