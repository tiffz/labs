import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { reindexGesturePacksMissingPhotos } from '../drive/gesturePackIndex';
import { reconcileStaleGestureUploadPacks } from '../drive/reconcileStaleGestureUploadPacks';
import {
  GESTURE_EMPTY_PACK_FILES,
  GESTURE_EMPTY_PACKS,
} from './gestureLiveQueryEmpty';

/** After sync or on load, heal missing photo indexes and stale upload flags from Drive backup. */
export function useGestureAutoReindex(enabled: boolean): void {
  const inFlightRef = useRef(false);
  const packsRaw = useLiveQuery(() => gestureDb.packs.toArray(), [], undefined);
  const packFilesRaw = useLiveQuery(() => gestureDb.packFiles.toArray(), [], undefined);
  const packs = packsRaw ?? GESTURE_EMPTY_PACKS;
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;

  const needsReindex = useMemo(() => {
    if (packs.length === 0) return false;
    const countByPack = new Map<string, number>();
    for (const file of packFiles) {
      countByPack.set(file.packId, (countByPack.get(file.packId) ?? 0) + 1);
    }
    return packs.some(
      (pack) =>
        pack.uploadStatus !== 'uploading' && (countByPack.get(pack.id) ?? 0) === 0,
    );
  }, [packFiles, packs]);

  const needsUploadReconcile = useMemo(
    () => packs.some((pack) => pack.uploadStatus === 'uploading' || pack.uploadStatus === 'incomplete'),
    [packs],
  );

  const runMaintenance = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await readGestureDriveAccessToken();
      if (needsReindex && token) {
        await reindexGesturePacksMissingPhotos(token);
      }
      if (needsUploadReconcile) {
        await reconcileStaleGestureUploadPacks();
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, needsReindex, needsUploadReconcile]);

  useEffect(() => {
    if (!enabled || (!needsReindex && !needsUploadReconcile)) return;
    void runMaintenance();
  }, [enabled, needsReindex, needsUploadReconcile, runMaintenance]);
}
