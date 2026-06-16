import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import { GESTURE_PREVIEW_THUMB_WIDTH } from '../media/gestureMediaPolicy';
import { gesturePreviewResolveTier } from '../media/gesturePreviewResolvePriority';
import {
  getGesturePreviewCacheSnapshot,
  peekGesturePreviewUrl,
  releaseGesturePreviewUrlsForDisplay,
  resolveGesturePreviewImageUrl,
  retainGesturePreviewUrlsForDisplay,
  retryGesturePreviewAfterImageError,
  subscribeGesturePreviewCacheForIds,
} from '../media/gesturePreviewImageUrl';

function readUrlsForIds(ids: string[], width: number): string[] {
  return ids.map((id) => peekGesturePreviewUrl(id, width) ?? '');
}

export function usePackPreviewUrls(
  driveFileIds: string[],
  limit = 4,
  /** When false, skip network fetches but still show in-memory https cache hits. */
  fetchEnabled = true,
  thumbWidth = GESTURE_PREVIEW_THUMB_WIDTH,
): { urls: string[]; loading: boolean; retryPreview: (fileId: string) => Promise<void> } {
  const ids = useMemo(() => driveFileIds.slice(0, limit).filter(Boolean), [driveFileIds, limit]);
  const key = `${ids.join(',')}@${thumbWidth}`;

  const cacheSnapshot = useSyncExternalStore(
    (onStoreChange) => subscribeGesturePreviewCacheForIds(ids, onStoreChange),
    () => getGesturePreviewCacheSnapshot(ids, thumbWidth),
    () => getGesturePreviewCacheSnapshot(ids, thumbWidth),
  );

  const [urls, setUrls] = useState<string[]>(() => readUrlsForIds(ids, thumbWidth));
  const [loading, setLoading] = useState(() => ids.some((id) => !peekGesturePreviewUrl(id, thumbWidth)));

  useEffect(() => {
    retainGesturePreviewUrlsForDisplay(ids);
    return () => releaseGesturePreviewUrlsForDisplay(ids);
  }, [ids, key]);

  useEffect(() => {
    if (ids.length === 0) {
      setUrls([]);
      setLoading(false);
      return;
    }

    const cached = readUrlsForIds(ids, thumbWidth);
    setUrls(cached);

    if (cached.every(Boolean)) {
      setLoading(false);
      return;
    }

    if (!fetchEnabled) {
      setLoading(cached.some((url) => !url));
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const token = await readGestureDriveAccessToken();
      if (cancelled) return;

      const indexById = new Map(ids.map((id, index) => [id, index]));
      const resolveOrder = [...ids].sort(
        (a, b) => gesturePreviewResolveTier(a) - gesturePreviewResolveTier(b),
      );
      const resolvedById = new Map<string, string>();
      for (const id of resolveOrder) {
        if (cancelled) break;
        const index = indexById.get(id) ?? 0;
        const url =
          cached[index] || (await resolveGesturePreviewImageUrl(token, id, thumbWidth));
        resolvedById.set(id, url);
      }
      if (cancelled) return;
      setUrls(ids.map((id) => resolvedById.get(id) ?? ''));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, ids, key, thumbWidth]);

  const displayUrls = useMemo(() => {
    void cacheSnapshot;
    return ids.map((id, index) => peekGesturePreviewUrl(id, thumbWidth) || urls[index] || '');
  }, [cacheSnapshot, ids, thumbWidth, urls]);

  const stillLoading = loading && displayUrls.some((url) => !url);

  const retryPreview = useCallback(
    async (fileId: string) => {
      if (!fileId) return;
      const index = ids.indexOf(fileId);
      if (index < 0) return;
      const token = await readGestureDriveAccessToken();
      const url = await retryGesturePreviewAfterImageError(token, fileId, thumbWidth);
      setUrls((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setLoading(false);
    },
    [ids, thumbWidth],
  );

  return { urls: displayUrls, loading: stillLoading, retryPreview };
}
