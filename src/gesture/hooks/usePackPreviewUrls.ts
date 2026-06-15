import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import {
  getGesturePreviewCacheSnapshot,
  peekGesturePreviewUrl,
  releaseGesturePreviewUrlsForDisplay,
  resolveGesturePreviewImageUrl,
  retainGesturePreviewUrlsForDisplay,
  subscribeGesturePreviewCacheForIds,
} from '../media/gesturePreviewImageUrl';

function readUrlsForIds(ids: string[]): string[] {
  return ids.map((id) => peekGesturePreviewUrl(id) ?? '');
}

export function usePackPreviewUrls(
  driveFileIds: string[],
  limit = 4,
  /** When false, skip network fetches but still show in-memory https cache hits. */
  fetchEnabled = true,
): { urls: string[]; loading: boolean } {
  const ids = useMemo(() => driveFileIds.slice(0, limit).filter(Boolean), [driveFileIds, limit]);
  const key = ids.join(',');

  const cacheSnapshot = useSyncExternalStore(
    (onStoreChange) => subscribeGesturePreviewCacheForIds(ids, onStoreChange),
    () => getGesturePreviewCacheSnapshot(ids),
    () => getGesturePreviewCacheSnapshot(ids),
  );

  const [urls, setUrls] = useState<string[]>(() => readUrlsForIds(ids));
  const [loading, setLoading] = useState(() => ids.some((id) => !peekGesturePreviewUrl(id)));

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

    const cached = readUrlsForIds(ids);
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

      const resolved = await Promise.all(
        ids.map((id, index) => cached[index] || resolveGesturePreviewImageUrl(token, id)),
      );
      if (cancelled) return;
      setUrls(resolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, ids, key]);

  const displayUrls = useMemo(() => {
    void cacheSnapshot;
    return ids.map((id, index) => peekGesturePreviewUrl(id) || urls[index] || '');
  }, [cacheSnapshot, ids, urls]);

  const stillLoading = loading && displayUrls.some((url) => !url);

  return { urls: displayUrls, loading: stillLoading };
}
