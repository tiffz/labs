import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { packNeedsPhotoReindex, reindexGesturePacksMissingPhotos } from '../drive/gesturePackIndex';
import { reconcileStaleGestureUploadPacks } from '../drive/reconcileStaleGestureUploadPacks';
import {
  GESTURE_EMPTY_PACK_FILES,
  GESTURE_EMPTY_PACKS,
} from './gestureLiveQueryEmpty';

function packCountMap(packFiles: typeof GESTURE_EMPTY_PACK_FILES): Map<string, number> {
  const countByPack = new Map<string, number>();
  for (const file of packFiles) {
    countByPack.set(file.packId, (countByPack.get(file.packId) ?? 0) + 1);
  }
  return countByPack;
}

/** After sync or on load, heal missing photo indexes and stale upload flags from Drive backup. */
export function useGestureAutoReindex(enabled: boolean): void {
  const inFlightRef = useRef(false);
  const packsRaw = useLiveQuery(() => gestureDb.packs.toArray(), [], undefined);
  const packFilesRaw = useLiveQuery(() => gestureDb.packFiles.toArray(), [], undefined);
  const packs = packsRaw ?? GESTURE_EMPTY_PACKS;
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;

  const needsReindex = useMemo(() => {
    if (packsRaw === undefined || packFilesRaw === undefined) return false;
    if (packs.length === 0) return false;
    const countByPack = packCountMap(packFiles);
    return packs.some((pack) => packNeedsPhotoReindex(pack, countByPack.get(pack.id) ?? 0));
  }, [packFiles, packFilesRaw, packs, packsRaw]);

  /** Changes when indexed counts shift for packs with upload flags — triggers reconcile. */
  const uploadLedgerFingerprint = useMemo(() => {
    if (packsRaw === undefined || packFilesRaw === undefined) return '';
    const countByPack = packCountMap(packFiles);
    const flagged = packs.filter((pack) => pack.uploadStatus);
    if (flagged.length === 0) return '';
    return flagged
      .map((pack) => `${pack.id}:${countByPack.get(pack.id) ?? 0}:${pack.expectedFileCount ?? 0}`)
      .join('|');
  }, [packFiles, packFilesRaw, packs, packsRaw]);

  const runMaintenance = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await readGestureDriveAccessToken();
      if (needsReindex && token) {
        await reindexGesturePacksMissingPhotos(token);
      }
      if (uploadLedgerFingerprint) {
        await reconcileStaleGestureUploadPacks();
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, needsReindex, uploadLedgerFingerprint]);

  useEffect(() => {
    if (!enabled || (!needsReindex && !uploadLedgerFingerprint)) return;
    void runMaintenance();
  }, [enabled, needsReindex, uploadLedgerFingerprint, runMaintenance]);
}
