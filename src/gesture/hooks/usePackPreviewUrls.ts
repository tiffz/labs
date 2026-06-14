import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import {
  getGesturePreviewCacheVersion,
  peekGesturePreviewUrl,
  resolveGesturePreviewImageUrl,
  subscribeGesturePreviewCache,
} from '../media/gesturePreviewImageUrl';

function readUrlsForIds(ids: string[]): string[] {
  return ids.map((id) => peekGesturePreviewUrl(id) ?? '');
}

export function usePackPreviewUrls(
  driveFileIds: string[],
  limit = 4,
): { urls: string[]; loading: boolean } {
  const ids = useMemo(() => driveFileIds.slice(0, limit).filter(Boolean), [driveFileIds, limit]);
  const key = ids.join(',');

  useSyncExternalStore(
    subscribeGesturePreviewCache,
    getGesturePreviewCacheVersion,
    getGesturePreviewCacheVersion,
  );

  const [urls, setUrls] = useState<string[]>(() => readUrlsForIds(ids));
  const [loading, setLoading] = useState(() => ids.some((id) => !peekGesturePreviewUrl(id)));

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

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: false }).catch(() => null);
      const resolved = await Promise.all(ids.map((id) => resolveGesturePreviewImageUrl(token, id)));
      if (cancelled) return;
      setUrls(resolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ids, key]);

  const syncedUrls = useMemo(() => {
    const peeked = readUrlsForIds(ids);
    if (peeked.every(Boolean)) return peeked;
    return urls.map((url, index) => url || peeked[index] || '');
  }, [ids, urls]);

  const stillLoading = loading && syncedUrls.some((url) => !url);

  return { urls: syncedUrls, loading: stillLoading };
}
