import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { packNeedsPhotoReindex, reindexGesturePacksMissingPhotos } from '../drive/gesturePackIndex';
import { reconcileStaleGestureUploadPacks } from '../drive/reconcileStaleGestureUploadPacks';
import { useGesturePackStats } from './useGesturePackStats';
import { GESTURE_EMPTY_PACKS } from './gestureLiveQueryEmpty';

/** After sync or on load, heal missing photo indexes and stale upload flags from Drive backup. */
export function useGestureAutoReindex(enabled: boolean): void {
  const inFlightRef = useRef(false);
  const { counts, statsHydrated } = useGesturePackStats();
  const packsRaw = useLiveQuery(() => gestureDb.packs.toArray(), [], undefined);
  const packs = packsRaw ?? GESTURE_EMPTY_PACKS;

  const needsReindex = useMemo(() => {
    if (!statsHydrated || packs.length === 0) return false;
    return packs.some((pack) => packNeedsPhotoReindex(pack, counts.get(pack.id) ?? 0));
  }, [counts, packs, statsHydrated]);

  const uploadLedgerFingerprint = useMemo(() => {
    if (!statsHydrated) return '';
    const flagged = packs.filter((pack) => pack.uploadStatus);
    if (flagged.length === 0) return '';
    return flagged
      .map((pack) => `${pack.id}:${counts.get(pack.id) ?? 0}:${pack.expectedFileCount ?? 0}`)
      .join('|');
  }, [counts, packs, statsHydrated]);

  const runMaintenance = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await readGestureDriveAccessToken();
      if (needsReindex && token) {
        await reindexGesturePacksMissingPhotos(token);
      }
      if (uploadLedgerFingerprint && token) {
        await reconcileStaleGestureUploadPacks(token);
      } else if (uploadLedgerFingerprint) {
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
