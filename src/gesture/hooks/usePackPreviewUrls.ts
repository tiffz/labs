import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import {
  getGesturePreviewCacheSnapshot,
  hydrateGesturePreviewFromIdb,
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
  subscribeGesturePreviewCacheForIds,
} from '../media/gesturePreviewImageUrl';

function readUrlsForIds(ids: string[]): string[] {
  return ids.map((id) => peekGesturePreviewUrl(id) ?? '');
}

export function usePackPreviewUrls(
  driveFileIds: string[],
  limit = 4,
  /** When false, skip network fetches but still show IDB / in-memory cache hits. */
  fetchEnabled = true,
): { urls: string[]; loading: boolean } {
  const ids = useMemo(() => driveFileIds.slice(0, limit).filter(Boolean), [driveFileIds, limit]);
  const key = ids.join(',');

  useSyncExternalStore(
    (onStoreChange) => subscribeGesturePreviewCacheForIds(ids, onStoreChange),
    () => getGesturePreviewCacheSnapshot(ids),
    () => getGesturePreviewCacheSnapshot(ids),
  );

  const [urls, setUrls] = useState<string[]>(() => readUrlsForIds(ids));
  const [loading, setLoading] = useState(
    () => ids.some((id) => !peekGesturePreviewUrl(id)),
  );

  useEffect(() => {
    if (ids.length === 0) {
      setUrls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      let current = readUrlsForIds(ids);
      setUrls(current);

      const needHydrate = ids.filter((_id, index) => !current[index]);
      if (needHydrate.length > 0) {
        await Promise.all(needHydrate.map((id) => hydrateGesturePreviewFromIdb(id)));
        if (cancelled) return;
        current = readUrlsForIds(ids);
        setUrls(current);
      }

      if (current.every(Boolean)) {
        setLoading(false);
        return;
      }

      if (!fetchEnabled) {
        setLoading(current.some((url) => !url));
        return;
      }

      setLoading(true);
      const token = await readGestureDriveAccessToken();
      const resolved = await Promise.all(
        ids.map((id, index) => current[index] || resolveGesturePreviewImageUrl(token, id)),
      );
      if (cancelled) return;
      setUrls(resolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, ids, key]);

  const syncedUrls = useMemo(() => {
    const peeked = readUrlsForIds(ids);
    if (peeked.every(Boolean)) return peeked;
    return urls.map((url, index) => url || peeked[index] || '');
  }, [ids, urls]);

  const stillLoading = loading && syncedUrls.some((url) => !url);

  return { urls: syncedUrls, loading: stillLoading };
}
